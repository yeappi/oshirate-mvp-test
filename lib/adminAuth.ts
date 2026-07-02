import { createSupabaseServerClient } from './supabase-server'

export type AdminCheckResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 }

// API Route から呼ぶ：認証 + 管理者確認を一括で行う
export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { ok: false, status: 403 }
  return { ok: true, userId: user.id }
}

// Page (Server Component) から呼ぶ：非管理者は / へリダイレクト
export async function getAdminUser() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return { id: user.id, email: user.email }
}
