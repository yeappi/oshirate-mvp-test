import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const supabase = createSupabaseServerClient()

  // profiles は RLS で自分しか読めないため service role が必要だが、
  // MVP では security definer RPC を使って全件取得する
  const { data, error } = await supabase.rpc('admin_get_users')

  if (error) {
    console.error('[admin/users] rpc error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  return NextResponse.json({ users: data })
}
