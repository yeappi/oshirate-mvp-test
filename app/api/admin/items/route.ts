import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { ItemType } from '@/lib/itemTypes'

const ITEM_TYPES: ItemType[] = ['ILLUST_TICKET', 'BACKGROUND_TICKET', 'FRAME_TICKET', 'TAG_TICKET']

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanNullable(value: unknown): string | null {
  const text = cleanString(value)
  return text ? text : null
}

function cleanDate(value: unknown): string | null {
  const text = cleanString(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function POST(request: Request) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const supabase = createSupabaseServerClient()
  const body = await request.json()
  const action = cleanString(body.action)

  if (action === 'create_item') {
    const name = cleanString(body.name)
    const description = cleanNullable(body.description)
    const itemType = cleanString(body.itemType) as ItemType
    const targetId = cleanString(body.targetId)
    const charismaValueRaw = cleanString(body.charismaValue)
    const charismaValue = charismaValueRaw ? Math.max(0, Number.parseInt(charismaValueRaw, 10) || 0) : null

    if (!name) return NextResponse.json({ error: 'アイテム名を入力してください' }, { status: 400 })
    if (!ITEM_TYPES.includes(itemType)) return NextResponse.json({ error: 'アイテム種別が不正です' }, { status: 400 })
    if (!targetId) return NextResponse.json({ error: '対象を選択してください' }, { status: 400 })

    const values = {
      name,
      description,
      item_type: itemType,
      target_illustration_id: itemType === 'ILLUST_TICKET' ? targetId : null,
      target_background_id: itemType === 'BACKGROUND_TICKET' ? targetId : null,
      target_avatar_frame_id: itemType === 'FRAME_TICKET' ? targetId : null,
      target_tag_id: itemType === 'TAG_TICKET' ? targetId : null,
      charisma_value: itemType === 'ILLUST_TICKET' ? charismaValue : null,
      is_active: true,
    }

    const { data, error } = await supabase
      .from('items')
      .insert(values)
      .select('id, name, item_type, is_active, created_at')
      .single()

    if (error) {
      console.error('[admin items create]', error)
      return NextResponse.json({ error: 'アイテム作成に失敗しました' }, { status: 500 })
    }

    // 限定イラスト券を作った時点で、対象イラストも「特別 / チケット限定」に自動設定する。
    // adminで「イラスト設定」と「アイテム設定」を別々に触らないで済むようにする。
    if (itemType === 'ILLUST_TICKET') {
      const { error: illustrationError } = await supabase
        .from('illustrations')
        .update({
          is_special: true,
          requires_item_ticket: true,
          special_label: name.slice(0, 24) || '限定',
        })
        .eq('id', targetId)

      if (illustrationError) {
        console.error('[admin items mark illustration special]', illustrationError)
        return NextResponse.json({ error: 'アイテムは作成しましたが、対象イラストの限定設定に失敗しました' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, item: data })
  }

  if (action === 'distribute_item') {
    const itemId = cleanString(body.itemId)
    const userId = cleanString(body.userId)
    const mode = cleanString(body.mode)
    const expiresAt = cleanDate(body.expiresAt)

    if (!itemId) return NextResponse.json({ error: 'アイテムを選択してください' }, { status: 400 })
    if (mode !== 'all' && !userId) return NextResponse.json({ error: '配布先を選択してください' }, { status: 400 })

    const { data: item } = await supabase
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('is_active', true)
      .single()
    if (!item) return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 })

    let targetIds: string[] = []
    if (mode === 'all') {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
      if (usersError || !users) return NextResponse.json({ error: 'ユーザー取得に失敗しました' }, { status: 500 })
      targetIds = users.map((u: any) => String(u.id))
    } else {
      targetIds = [userId]
    }

    const rows = targetIds.map((id) => ({ user_id: id, item_id: itemId, expires_at: expiresAt }))
    const { error } = await supabase.from('user_items').insert(rows)
    if (error) {
      console.error('[admin items distribute]', error)
      return NextResponse.json({ error: '配布に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: rows.length })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
