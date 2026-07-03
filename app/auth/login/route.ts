import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    console.error('[auth/login] signInWithOAuth error:', {
      message: error?.message,
      status: error?.status,
      name: error?.name,
    })
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed`)
  }

  return NextResponse.redirect(data.url)
}
