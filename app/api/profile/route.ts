import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { updateProfile } from '@/lib/auth'

// POST /api/profile
// body: { name?, avatar_url?, profile_comment? }
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, avatar_url, profile_comment } = body as {
    name?: string
    avatar_url?: string
    profile_comment?: string
  }

  const fields: { name?: string; avatar_url?: string; profile_comment?: string } = {}

  // name: 空文字のみは更新しない。値があれば30文字以内
  if (typeof name === 'string') {
    const trimmed = name.trim()
    if (trimmed === '') {
      return NextResponse.json({ error: '表示名を空にすることはできません' }, { status: 400 })
    }
    if (trimmed.length > 30) {
      return NextResponse.json({ error: '表示名は30文字以内にしてください' }, { status: 400 })
    }
    fields.name = trimmed
  }

  // avatar_url: 空文字はOK（クリア）。値があれば http(s):// 始まりのみ
  if (typeof avatar_url === 'string') {
    const trimmed = avatar_url.trim()
    if (trimmed !== '' && !/^https?:\/\//i.test(trimmed)) {
      return NextResponse.json(
        { error: 'アイコン画像URLは https:// または http:// で始まるURLを入力してください' },
        { status: 400 }
      )
    }
    fields.avatar_url = trimmed
  }

  // profile_comment: 140文字以内
  if (typeof profile_comment === 'string') {
    const trimmed = profile_comment.trim()
    if (trimmed.length > 140) {
      return NextResponse.json({ error: 'ひとことは140文字以内にしてください' }, { status: 400 })
    }
    fields.profile_comment = trimmed
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: '更新する項目がありません' }, { status: 400 })
  }

  const result = await updateProfile(user.id, fields)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? '保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
