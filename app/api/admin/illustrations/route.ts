import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

type Payload = {
  id?: string | null
  title?: unknown
  description?: unknown
  price?: unknown
  max_per_user?: unknown
  sort_order?: unknown
  is_active?: unknown
  reward_tag_id?: unknown
  image_url?: unknown
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseIntField(value: unknown, fallback: number): number {
  const raw = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(raw) ? raw : fallback
}

function parseNullablePositiveInt(value: unknown): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number.parseInt(text, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

function normalizeRewardTag(value: unknown): string | null {
  const tag = asTrimmedString(value)
  return tag ? tag : null
}

function normalizeImageUrl(value: unknown): string | null {
  const url = asTrimmedString(value)
  if (!url) return null
  if (!url.startsWith('https://')) return null
  return url
}

async function handleSave(request: Request, mode: 'create' | 'update') {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const body = (await request.json()) as Payload
  const title = asTrimmedString(body.title)
  const description = asTrimmedString(body.description)
  const price = parseIntField(body.price, -1)
  const sortOrder = parseIntField(body.sort_order, 0)
  const maxPerUser = parseNullablePositiveInt(body.max_per_user)
  const rewardTagId = normalizeRewardTag(body.reward_tag_id)
  const imageUrl = normalizeImageUrl(body.image_url)
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true

  if (!title) {
    return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
  }
  if (title.length > 60) {
    return NextResponse.json({ error: 'タイトルは60文字以内です' }, { status: 400 })
  }
  if (description.length > 240) {
    return NextResponse.json({ error: '説明は240文字以内です' }, { status: 400 })
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: '必要ptは0以上の数字で入力してください' }, { status: 400 })
  }
  if (mode === 'create' && !imageUrl) {
    return NextResponse.json({ error: 'イラスト画像を選んでください' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  if (rewardTagId) {
    const { data: tag } = await supabase
      .from('profile_tags')
      .select('id')
      .eq('id', rewardTagId)
      .eq('is_active', true)
      .single()
    if (!tag) {
      return NextResponse.json({ error: '特典タグが見つかりません' }, { status: 400 })
    }
  }

  const values = {
    title,
    description: description || null,
    price,
    image_url: imageUrl,
    max_per_user: maxPerUser,
    reward_tag_id: rewardTagId,
    is_active: isActive,
    sort_order: sortOrder,
  }

  if (mode === 'create') {
    const { data, error } = await supabase
      .from('illustrations')
      .insert(values)
      .select('id, title, description, price, image_url, max_per_user, reward_tag_id, is_active, sort_order')
      .single()

    if (error) {
      console.error('[admin illustrations POST]', error)
      return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, illustration: data })
  }

  const id = asTrimmedString(body.id)
  if (!id) return NextResponse.json({ error: 'idがありません' }, { status: 400 })

  const { data, error } = await supabase
    .from('illustrations')
    .update(values)
    .eq('id', id)
    .select('id, title, description, price, image_url, max_per_user, reward_tag_id, is_active, sort_order')
    .single()

  if (error) {
    console.error('[admin illustrations PATCH]', error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, illustration: data })
}

export async function POST(request: Request) {
  return handleSave(request, 'create')
}

export async function PATCH(request: Request) {
  return handleSave(request, 'update')
}
