import { createSupabaseServerClient } from './supabase-server'
import type { FollowProfile } from './follows'
import { getFollowingProfiles } from './follows'
import type { ItemType } from './itemTypes'
import { getItemTypeLabel } from './itemTypes'

export type OwnedItem = {
  userItemId: string
  itemId: string
  name: string
  description: string | null
  itemType: ItemType
  expiresAt: string | null
  usedAt: string | null
  usedTargetUserId: string | null
  createdAt: string
  status: 'available' | 'used' | 'expired'
  targetLabel: string
  targetImageUrl: string | null
  targetIllustrationId: string | null
  targetBackgroundId: string | null
  targetAvatarFrameId: string | null
  targetTagId: string | null
  charismaValue: number | null
}

export type ItemTargetCandidate = Pick<FollowProfile, 'id' | 'name' | 'avatar_url' | 'is_admin' | 'charisma'> & {
  isSelf: boolean
}

function firstRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function resolveStatus(row: { used_at: string | null; expires_at: string | null }): OwnedItem['status'] {
  if (row.used_at) return 'used'
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return 'expired'
  return 'available'
}

export async function getOwnedItems(userId: string): Promise<OwnedItem[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('user_items')
    .select(`
      id,
      expires_at,
      used_at,
      used_target_user_id,
      created_at,
      items(
        id,
        name,
        description,
        item_type,
        target_illustration_id,
        target_background_id,
        target_avatar_frame_id,
        target_tag_id,
        charisma_value,
        illustrations(id, title, image_url, price),
        profile_backgrounds(id, name),
        avatar_frames(id, name),
        profile_tags(id, label)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .map((row: any): OwnedItem | null => {
      const item = firstRelation(row.items)
      if (!item) return null
      const illustration = firstRelation(item.illustrations)
      const background = firstRelation(item.profile_backgrounds)
      const frame = firstRelation(item.avatar_frames)
      const tag = firstRelation(item.profile_tags)
      const itemType = String(item.item_type) as ItemType
      const fallback = getItemTypeLabel(itemType)
      const targetLabel = illustration?.title ?? background?.name ?? frame?.name ?? tag?.label ?? fallback
      return {
        userItemId: String(row.id),
        itemId: String(item.id),
        name: String(item.name ?? fallback),
        description: item.description ?? null,
        itemType,
        expiresAt: row.expires_at ?? null,
        usedAt: row.used_at ?? null,
        usedTargetUserId: row.used_target_user_id ?? null,
        createdAt: String(row.created_at),
        status: resolveStatus(row),
        targetLabel: String(targetLabel),
        targetImageUrl: illustration?.image_url ?? null,
        targetIllustrationId: item.target_illustration_id ?? null,
        targetBackgroundId: item.target_background_id ?? null,
        targetAvatarFrameId: item.target_avatar_frame_id ?? null,
        targetTagId: item.target_tag_id ?? null,
        charismaValue: item.charisma_value === null || item.charisma_value === undefined
          ? (illustration?.price === undefined ? null : Number(illustration.price))
          : Number(item.charisma_value),
      }
    })
    .filter((item): item is OwnedItem => Boolean(item))
    .sort((a, b) => {
      const order = { available: 0, expired: 1, used: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

export async function getItemTargetCandidates(userId: string): Promise<ItemTargetCandidate[]> {
  const supabase = createSupabaseServerClient()
  const [{ data: selfProfile }, following] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, avatar_url, is_admin, charisma')
      .eq('id', userId)
      .single(),
    getFollowingProfiles(userId),
  ])

  const self: ItemTargetCandidate = {
    id: userId,
    name: selfProfile?.name ?? '自分',
    avatar_url: selfProfile?.avatar_url ?? null,
    is_admin: Boolean(selfProfile?.is_admin),
    charisma: Number(selfProfile?.charisma ?? 0),
    isSelf: true,
  }

  return [
    self,
    ...following.map((profile) => ({
      id: profile.id,
      name: profile.name ?? 'ユーザー',
      avatar_url: profile.avatar_url,
      is_admin: Boolean(profile.is_admin),
      charisma: Number(profile.charisma ?? 0),
      isSelf: false,
    })),
  ]
}

export async function getUserUnlockedBackgroundIds(userId: string): Promise<Set<string>> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('user_unlocked_backgrounds')
    .select('background_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map((row: any) => String(row.background_id)))
}

export async function getUserUnlockedAvatarFrameIds(userId: string): Promise<Set<string>> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('user_unlocked_avatar_frames')
    .select('frame_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map((row: any) => String(row.frame_id)))
}
