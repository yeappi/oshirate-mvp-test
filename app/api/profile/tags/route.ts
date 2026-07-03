import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const MAX_TAGS = 3

function firstRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const rawTagIds = (body as { tagIds?: unknown }).tagIds

  if (!Array.isArray(rawTagIds)) {
    return NextResponse.json({ error: 'タグを選択してください' }, { status: 400 })
  }

  const tagIds = Array.from(new Set(
    rawTagIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter(Boolean)
  ))

  if (tagIds.length > MAX_TAGS) {
    return NextResponse.json({ error: `プロフィールに貼れるタグは最大${MAX_TAGS}個までです` }, { status: 400 })
  }

  if (tagIds.length > 0) {
    const { data: ownedRows, error: ownedError } = await supabase
      .from('user_tags')
      .select('tag_id, profile_tags(id, is_active)')
      .eq('user_id', user.id)
      .in('tag_id', tagIds)

    if (ownedError) {
      console.error('[profile tags POST] owned check error:', ownedError)
      return NextResponse.json({ error: '所持タグの確認に失敗しました' }, { status: 500 })
    }

    const ownedActiveIds = new Set(
      (ownedRows ?? [])
        .filter((row: any) => firstRelation(row.profile_tags)?.is_active)
        .map((row: any) => String(row.tag_id))
    )

    if (ownedActiveIds.size !== tagIds.length) {
      return NextResponse.json({ error: '所持していないタグは設定できません' }, { status: 403 })
    }
  }

  const { error: deleteError } = await supabase
    .from('profile_display_tags')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[profile tags POST] delete error:', deleteError)
    return NextResponse.json({ error: 'タグの保存に失敗しました' }, { status: 500 })
  }

  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId, index) => ({
      user_id: user.id,
      tag_id: tagId,
      display_order: index + 1,
    }))

    const { error: insertError } = await supabase
      .from('profile_display_tags')
      .insert(rows)

    if (insertError) {
      console.error('[profile tags POST] insert error:', insertError)
      return NextResponse.json({ error: 'タグの保存に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
