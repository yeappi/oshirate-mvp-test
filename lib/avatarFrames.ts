import { createSupabaseServerClient } from './supabase-server'

export type AvatarFrame = {
  id: string
  name: string
  css_key: string
  required_spent_points: number
  required_charisma: number
  description: string | null
  sort_order: number
  is_active: boolean
}

export const DEFAULT_AVATAR_FRAME_ID = 'black'

export function isAvatarFrameUnlocked(
  frame: Pick<AvatarFrame, 'required_charisma'>,
  charisma: number
): boolean {
  return Number(charisma ?? 0) >= Number(frame.required_charisma ?? 0)
}

export async function getAvatarFrames(): Promise<AvatarFrame[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('avatar_frames')
    .select('*')
    .eq('is_active', true)
    .order('required_charisma', { ascending: true })
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

export async function getUnlockedAvatarFrames(charisma: number): Promise<AvatarFrame[]> {
  const frames = await getAvatarFrames()
  return frames.filter((frame) => isAvatarFrameUnlocked(frame, charisma))
}
