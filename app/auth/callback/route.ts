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
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user

  // 初回ログイン時に profiles レコードを作成
  // upsert: 既存レコードがあれば何もしない（name/avatar_url は上書きしない）
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        // is_admin は DB デフォルト(false)のまま
        // 管理者設定は Supabase ダッシュボードから手動で true に変更
      },
      {
        onConflict: 'id',
        ignoreDuplicates: true, // 既存レコードは触らない
      }
    )

  if (profileError) {
    console.error('[auth/callback] profile upsert error:', profileError)
    // プロフィール作成失敗してもログイン自体は通す
  }

  return NextResponse.redirect(`${origin}/`)
}
