import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserLevel } from '@/lib/level'
import { sanitizeAvatarDecorationSelection } from '@/lib/avatarDecorations'

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('charisma')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'プロフィールの取得に失敗しました' }, { status: 500 })
  }

  const body = await request.json()
  const lv = getUserLevel(Number(profile.charisma ?? 0)).lv

  const wing = sanitizeAvatarDecorationSelection('wing', body.wing, lv)
  const crown = sanitizeAvatarDecorationSelection('crown', body.crown, lv)
  const frontFx = sanitizeAvatarDecorationSelection('front_fx', body.frontFx, lv)

  if (wing === 'INVALID' || crown === 'INVALID' || frontFx === 'INVALID') {
    return NextResponse.json({ error: '未解放、または存在しない装飾が含まれています' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      selected_wing_asset: wing,
      selected_crown_asset: crown,
      selected_front_fx_asset: frontFx,
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message || '保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
