import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const userItemId = typeof body.userItemId === 'string' ? body.userItemId.trim() : ''
  const targetUserId = typeof body.targetUserId === 'string' && body.targetUserId.trim()
    ? body.targetUserId.trim()
    : null

  if (!userItemId) {
    return NextResponse.json({ ok: false, error: 'item_not_found' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('use_owned_item', {
    p_user_item_id: userItemId,
    p_target_user_id: targetUserId,
  })

  if (error) {
    console.error('[items use] rpc error', error)
    return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
  }

  const result = data as { ok?: boolean; error?: string }
  if (!result?.ok) {
    return NextResponse.json({ ok: false, error: result?.error ?? 'unknown' }, { status: 400 })
  }

  return NextResponse.json(result)
}
