import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ============================================================
// POST /api/notifications/read
// 呼ぶと自分の未読をまとめて既読にする
// ============================================================
export async function POST() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.rpc('mark_notifications_read', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('[notifications/read] rpc error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
