import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { frameId } = body as { frameId?: string }

  if (!frameId || typeof frameId !== 'string') {
    return NextResponse.json({ error: 'フレームを選択してください' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_spent_points')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: frame } = await supabase
    .from('avatar_frames')
    .select('id, required_spent_points, is_active')
    .eq('id', frameId)
    .eq('is_active', true)
    .single()

  if (!frame) {
    return NextResponse.json({ error: 'フレームが見つかりません' }, { status: 404 })
  }

  const { data: itemUnlock } = await supabase
    .from('user_unlocked_avatar_frames')
    .select('frame_id')
    .eq('user_id', user.id)
    .eq('frame_id', frame.id)
    .maybeSingle()

  const totalSpentPoints = Number(profile.total_spent_points ?? 0)
  if (Number(frame.required_spent_points ?? 0) > totalSpentPoints && !itemUnlock) {
    return NextResponse.json(
      { error: `このフレームは累計${Number(frame.required_spent_points).toLocaleString()}pt使用で解放されます` },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({ selected_avatar_frame_id: frame.id })
    .eq('id', user.id)

  if (error) {
    console.error('[profile frame POST] update error:', error)
    return NextResponse.json({ error: 'フレームの保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
