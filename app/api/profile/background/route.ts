import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { backgroundId } = body as { backgroundId?: string }

  if (!backgroundId || typeof backgroundId !== 'string') {
    return NextResponse.json({ error: '背景を選択してください' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_spent_points')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: background } = await supabase
    .from('profile_backgrounds')
    .select('id, required_spent_points, is_active')
    .eq('id', backgroundId)
    .eq('is_active', true)
    .single()

  if (!background) {
    return NextResponse.json({ error: '背景が見つかりません' }, { status: 404 })
  }

  const { data: itemUnlock } = await supabase
    .from('user_unlocked_backgrounds')
    .select('background_id')
    .eq('user_id', user.id)
    .eq('background_id', background.id)
    .maybeSingle()

  const totalSpentPoints = Number(profile.total_spent_points ?? 0)
  if (Number(background.required_spent_points ?? 0) > totalSpentPoints && !itemUnlock) {
    return NextResponse.json(
      { error: `この背景は累計${Number(background.required_spent_points).toLocaleString()}pt使用で解放されます` },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({ selected_background_id: background.id })
    .eq('id', user.id)

  if (error) {
    console.error('[profile background POST] update error:', error)
    return NextResponse.json({ error: '背景の保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
