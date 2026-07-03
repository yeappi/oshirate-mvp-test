import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession error:', {
      message: error?.message,
      status: error?.status,
      name: error?.name,
    })
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user

  // 初回ログイン時に profiles / 初期背景 / 初期タグをまとめて整える。
  // RPCが未適用のデプロイ直後でもログイン自体を止めないよう、失敗時は最低限のprofile upsertへfallbackする。
  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null
  const avatarUrl = user.user_metadata?.avatar_url ?? null

  const { error: bootstrapError } = await supabase.rpc('bootstrap_user_profile', {
    p_user_id: user.id,
    p_name: displayName,
    p_avatar_url: avatarUrl,
  })

  if (bootstrapError) {
    console.error('[auth/callback] bootstrap_user_profile error:', bootstrapError)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          name: displayName,
          avatar_url: avatarUrl,
        },
        {
          onConflict: 'id',
          ignoreDuplicates: true,
        }
      )

    if (profileError) {
      console.error('[auth/callback] fallback profile upsert error:', profileError)
      // プロフィール作成失敗してもログイン自体は通す
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
