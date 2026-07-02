import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

// GET /api/admin/announcement — 最新1件取得
export async function GET() {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ announcement: data ?? null })
}

// POST /api/admin/announcement — 保存（upsert）
// body: { id?, title, content, is_active }
export async function POST(request: Request) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const body = await request.json()
  const { id, title, content, is_active } = body as {
    id?: string
    title: string
    content: string
    is_active: boolean
  }

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'title and content required' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  if (id) {
    // 既存レコードを更新
    const { error } = await supabase
      .from('announcements')
      .update({ title: title.trim(), content: content.trim(), is_active })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 新規作成（古いものは全て非表示にしてから作る）
  await supabase
    .from('announcements')
    .update({ is_active: false })
    .eq('is_active', true)

  const { error } = await supabase
    .from('announcements')
    .insert({ title: title.trim(), content: content.trim(), is_active })

  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
