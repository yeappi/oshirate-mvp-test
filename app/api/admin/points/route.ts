import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

export async function POST(request: Request) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const body = await request.json()
  const { targetUserId, amount, reason } = body as {
    targetUserId: string
    amount: number
    reason: string
  }

  if (
    typeof targetUserId !== 'string' ||
    typeof amount !== 'number' ||
    amount === 0 ||
    typeof reason !== 'string' ||
    reason.trim() === ''
  ) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.rpc('admin_adjust_points', {
    p_admin_id:  check.userId,
    p_target_id: targetUserId,
    p_amount:    BigInt(amount),
    p_reason:    reason.trim(),
  })

  if (error) {
    console.error('[admin/points] rpc error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  const result = data as { ok: boolean; error?: string; previousPoints?: number; newPoints?: number }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(result)
}

export async function GET(request: Request) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get('targetUserId')

  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('admin_point_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (targetUserId) query = query.eq('target_user_id', targetUserId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })

  return NextResponse.json({ logs: data })
}
