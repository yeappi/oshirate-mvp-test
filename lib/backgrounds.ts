import { createSupabaseServerClient } from './supabase-server'

export type ProfileBackground = {
  id: string
  name: string
  description: string | null
  css_key: string
  image_url: string | null
  required_level: number
  required_spent_points: number
  sort_order: number
  is_active: boolean
}

export const DEFAULT_BACKGROUND_ID = 'starter'

export async function getProfileBackgrounds(): Promise<ProfileBackground[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('profile_backgrounds')
    .select('*')
    .eq('is_active', true)
    .order('required_spent_points', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error || !data) return []
  return data as ProfileBackground[]
}

export async function getProfileBackgroundById(
  backgroundId: string | null | undefined
): Promise<ProfileBackground | null> {
  const id = backgroundId || DEFAULT_BACKGROUND_ID
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('profile_backgrounds')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as ProfileBackground
}

export function isBackgroundUnlocked(
  background: Pick<ProfileBackground, 'required_spent_points'>,
  totalSpentPoints: number
): boolean {
  return Number(totalSpentPoints ?? 0) >= Number(background.required_spent_points ?? 0)
}
