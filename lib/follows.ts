import { createSupabaseServerClient } from './supabase-server'
import type { Profile } from './auth'
import { YAPI_USER_ID } from './staticData'

export type FollowProfile = Pick<Profile, 'id' | 'name' | 'avatar_url' | 'profile_comment' | 'is_admin' | 'charisma'> & {
  isFollowing: boolean
}

export async function isFollowingUser(followerId: string, followedId: string): Promise<boolean> {
  if (!followerId || !followedId || followerId === followedId) return false
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('user_follows')
    .select('followed_id')
    .eq('follower_id', followerId)
    .eq('followed_id', followedId)
    .maybeSingle()
  return Boolean(data)
}

export async function getDiscoverProfiles(currentUserId: string, isAdmin: boolean): Promise<FollowProfile[]> {
  const supabase = createSupabaseServerClient()

  const result = isAdmin
    ? await supabase
        .from('profiles')
        .select('id, name, avatar_url, profile_comment, is_admin, charisma, created_at')
        .order('created_at', { ascending: true })
    : YAPI_USER_ID
      ? await supabase
          .from('profiles')
          .select('id, name, avatar_url, profile_comment, is_admin, charisma, created_at')
          .eq('id', YAPI_USER_ID)
      : { data: [], error: null }

  const { data, error } = result
  if (error || !data) return []

  const ids = data.map((row: any) => String(row.id)).filter((id) => id !== currentUserId)
  const followingSet = await getFollowingIdSet(currentUserId, ids)

  return data
    .filter((row: any) => String(row.id) !== currentUserId)
    .map((row: any) => ({
      id: String(row.id),
      name: row.name ?? '名無し',
      avatar_url: row.avatar_url ?? null,
      profile_comment: row.profile_comment ?? null,
      is_admin: Boolean(row.is_admin),
      charisma: Number(row.charisma ?? 0),
      isFollowing: followingSet.has(String(row.id)),
    }))
}

export async function getFollowingProfiles(currentUserId: string): Promise<FollowProfile[]> {
  const supabase = createSupabaseServerClient()

  const { data: follows, error: followError } = await supabase
    .from('user_follows')
    .select('followed_id, created_at')
    .eq('follower_id', currentUserId)
    .order('created_at', { ascending: false })

  if (followError || !follows || follows.length === 0) return []

  const followedIds = follows.map((row: any) => String(row.followed_id))
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, profile_comment, is_admin, charisma')
    .in('id', followedIds)

  if (profileError || !profiles) return []

  const orderMap = new Map(followedIds.map((id, index) => [id, index]))

  return profiles
    .map((row: any) => ({
      id: String(row.id),
      name: row.name ?? '名無し',
      avatar_url: row.avatar_url ?? null,
      profile_comment: row.profile_comment ?? null,
      is_admin: Boolean(row.is_admin),
      charisma: Number(row.charisma ?? 0),
      isFollowing: true,
    }))
    .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
}

async function getFollowingIdSet(currentUserId: string, targetIds: string[]): Promise<Set<string>> {
  if (targetIds.length === 0) return new Set()
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('user_follows')
    .select('followed_id')
    .eq('follower_id', currentUserId)
    .in('followed_id', targetIds)

  return new Set((data ?? []).map((row: any) => String(row.followed_id)))
}
