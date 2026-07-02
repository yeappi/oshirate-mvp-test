import { createSupabaseServerClient } from './supabase-server'
import type { ActiveDecorations, Decoration, DecorationSlot } from './decorationTypes'

// ============================================================
// ユーザーが現在設定している装飾を取得
// ============================================================
export async function getActiveDecorations(
  userId: string
): Promise<ActiveDecorations> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('user_profile_decorations')
    .select(`
      slot,
      decoration:decoration_id (
        id, name, description, slot,
        asset_url, asset_type, required_rank, is_active
      )
    `)
    .eq('user_id', userId)

  if (error || !data) return {}

  type ActiveDecorationQueryRow = {
    slot: DecorationSlot
    decoration: Decoration | Decoration[] | null
  }

  const rows = data as unknown as ActiveDecorationQueryRow[]
  const result: ActiveDecorations = {}

  for (const row of rows) {
    const decoration = Array.isArray(row.decoration)
      ? row.decoration[0]
      : row.decoration
    if (decoration?.is_active) {
      result[row.slot] = decoration
    }
  }
  return result
}

// ============================================================
// ユーザーのランクで解放済みの装飾素材一覧を取得
// ============================================================
export async function getUnlockedDecorations(
  rank: number
): Promise<Decoration[]> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('profile_decorations')
    .select('*')
    .eq('is_active', true)
    .lte('required_rank', rank)
    .order('required_rank', { ascending: true })

  if (error || !data) return []
  return data as Decoration[]
}

// ============================================================
// 特定ランクで新たに解放される装飾素材
// ランクアップ演出で使う
// ============================================================
export async function getNewlyUnlockedDecorations(
  rank: number
): Promise<Decoration[]> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('profile_decorations')
    .select('*')
    .eq('is_active', true)
    .eq('required_rank', rank)

  if (error || !data) return []
  return data as Decoration[]
}
