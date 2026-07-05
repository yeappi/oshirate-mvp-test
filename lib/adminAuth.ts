import { createSupabaseServerClient } from './supabase-server'

export type AdminCheckResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 }

async function getAuthenticatedAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return { user, isAdmin: profile?.is_admin === true }
}

// API Route から呼ぶ：認証 + 管理者確認を一括で行う
export async function requireAdmin(): Promise<AdminCheckResult> {
  const { user, isAdmin } = await getAuthenticatedAdmin()
  if (!user) return { ok: false, status: 401 }
  if (!isAdmin) return { ok: false, status: 403 }
  return { ok: true, userId: user.id }
}

// Page (Server Component) から呼ぶ：非管理者は / へリダイレクト
export async function getAdminUser() {
  const { user, isAdmin } = await getAuthenticatedAdmin()
  if (!user || !isAdmin) return null
  return { id: user.id, email: user.email }
}
