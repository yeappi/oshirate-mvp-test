import { createSupabaseServerClient } from './supabase-server'

export type AvatarFrame = {
  id: string
  name: string
  css_key: string
  required_spent_points: number
  description: string | null
  sort_order: number
  is_active: boolean
}

export const DEFAULT_AVATAR_FRAME_ID = 'black'

export function isAvatarFrameUnlocked(
  frame: Pick<AvatarFrame, 'required_spent_points'>,
  totalSpentPoints: number
): boolean {
  return Number(totalSpentPoints ?? 0) >= Number(frame.required_spent_points ?? 0)
}

export async function getAvatarFrames(): Promise<AvatarFrame[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('avatar_frames')
    .select('*')
    .eq('is_active', true)
    .order('required_spent_points', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error || !data) return []
  return data as AvatarFrame[]
}

export async function getAvatarFrameById(frameId?: string | null): Promise<AvatarFrame | null> {
  if (!frameId) return null

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('avatar_frames')
    .select('*')
    .eq('id', frameId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as AvatarFrame
}

export async function getUnlockedAvatarFrames(totalSpentPoints: number): Promise<AvatarFrame[]> {
  const frames = await getAvatarFrames()
  return frames.filter((frame) => isAvatarFrameUnlocked(frame, totalSpentPoints))
}
