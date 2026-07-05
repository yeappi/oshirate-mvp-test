import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserLevel } from '@/lib/level'

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
    .select('charisma')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: background } = await supabase
    .from('profile_backgrounds')
    .select('id, required_level, is_active')
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

  const userLevel = getUserLevel(Number(profile.charisma ?? 0))
  if (background.required_level > userLevel.lv && !itemUnlock) {
    return NextResponse.json(
      { error: `この背景はLv${background.required_level}で解放されます` },
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
