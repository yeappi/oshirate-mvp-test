import { createSupabaseServerClient } from './supabase-server'

export type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
  profile_comment: string | null
  is_admin: boolean
  points: number
  charisma: number
}

// 現在のログインユーザーを取得（未ログインなら null）
export async function getUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// profiles テーブルからプロフィールを取得
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

// プロフィールを更新（自分のレコードのみ）
export async function updateProfile(
  userId: string,
  fields: { name?: string; avatar_url?: string; profile_comment?: string }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
