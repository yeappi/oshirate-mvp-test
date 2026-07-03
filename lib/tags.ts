import { createSupabaseServerClient } from './supabase-server'
import type { TagVariant } from './staticData'

export type ProfileTag = {
  id: string
  label: string
  variant: TagVariant
  description: string | null
  sort_order: number
  is_active: boolean
}

export type OwnedProfileTag = ProfileTag & {
  is_selected: boolean
  display_order: number | null
}

function normalizeVariant(value: unknown): TagVariant {
  if (value === 'rare' || value === 'high' || value === 'mid' || value === 'low') {
    return value
  }
  return 'mid'
}

function firstRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeTag(row: any): ProfileTag {
  return {
    id: String(row.id),
    label: String(row.label ?? ''),
    variant: normalizeVariant(row.variant),
    description: row.description ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
  }
}

export async function getUserOwnedTags(userId: string): Promise<OwnedProfileTag[]> {
  const supabase = createSupabaseServerClient()

  const [ownedResult, selectedResult] = await Promise.all([
    supabase
      .from('user_tags')
      .select('tag_id, profile_tags(id, label, variant, description, sort_order, is_active)')
      .eq('user_id', userId),
    supabase
      .from('profile_display_tags')
      .select('tag_id, display_order')
      .eq('user_id', userId)
      .order('display_order', { ascending: true }),
  ])

  if (ownedResult.error || !ownedResult.data) return []

  const selectedMap = new Map<string, number>()
  for (const row of selectedResult.data ?? []) {
    selectedMap.set(String(row.tag_id), Number(row.display_order))
  }

  const tags = ownedResult.data
    .map((row: any) => firstRelation(row.profile_tags))
    .filter(Boolean)
    .map(normalizeTag)
    .filter((tag) => tag.is_active)
    .map((tag) => ({
      ...tag,
      is_selected: selectedMap.has(tag.id),
      display_order: selectedMap.get(tag.id) ?? null,
    }))

  return tags.sort((a, b) => {
    if (a.is_selected && b.is_selected) {
      return (a.display_order ?? 99) - (b.display_order ?? 99)
    }
    if (a.is_selected) return -1
    if (b.is_selected) return 1
    return a.sort_order - b.sort_order
  })
}

export async function getProfileDisplayTags(userId: string): Promise<ProfileTag[]> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('profile_display_tags')
    .select('display_order, profile_tags(id, label, variant, description, sort_order, is_active)')
    .eq('user_id', userId)
    .order('display_order', { ascending: true })

  if (error || !data) return []

  return data
    .map((row: any) => firstRelation(row.profile_tags))
    .filter(Boolean)
    .map(normalizeTag)
    .filter((tag) => tag.is_active)
}
