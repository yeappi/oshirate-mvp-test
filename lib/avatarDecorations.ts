export type AvatarDecorationSlot = 'wing' | 'crown' | 'front_fx'

export type AvatarDecorationAsset = {
  id: string
  slot: AvatarDecorationSlot
  label: string
  requiredLv: number
  src: string
  className: string
  description: string
}

export type AvatarDecorationSelection = {
  wing: string | null
  crown: string | null
  frontFx: string | null
}

export const AUTO_DECORATION_VALUE = '__auto__'
export const NONE_DECORATION_VALUE = '__none__'

export const AVATAR_DECORATION_ASSETS: AvatarDecorationAsset[] = [
  {
    id: 'aura_lv25_wing_seed',
    slot: 'wing',
    label: '片翼の芽',
    requiredLv: 25,
    src: '/assets/avatar-aura/aura_lv25_wing_seed.png',
    className: 'asset-wing asset-wing-lv25',
    description: '小さな羽のはじまり',
  },
  {
    id: 'aura_lv30_double_wing',
    slot: 'wing',
    label: 'ふたつの羽',
    requiredLv: 30,
    src: '/assets/avatar-aura/aura_lv30_double_wing.png',
    className: 'asset-wing asset-wing-lv30',
    description: '左右に見える白い羽',
  },
  {
    id: 'aura_lv35_light_wing',
    slot: 'wing',
    label: '光の羽',
    requiredLv: 35,
    src: '/assets/avatar-aura/aura_lv35_light_wing.png',
    className: 'asset-wing asset-wing-lv35',
    description: '光をまとった白羽',
  },
  {
    id: 'aura_lv40_oshi_wing',
    slot: 'wing',
    label: '推され羽',
    requiredLv: 40,
    src: '/assets/avatar-aura/aura_lv40_oshi_wing.png',
    className: 'asset-wing asset-wing-lv40',
    description: 'Lv40の大きな羽装飾',
  },
  {
    id: 'aura_lv65_jewel_particles',
    slot: 'wing',
    label: '宝石の粒',
    requiredLv: 65,
    src: '/assets/avatar-aura/aura_lv65_jewel_particles.png',
    className: 'asset-wing asset-jewel-particles',
    description: '宝石化の予兆',
  },
  {
    id: 'aura_lv70_jewel_wing_start',
    slot: 'wing',
    label: '宝石の羽',
    requiredLv: 70,
    src: '/assets/avatar-aura/aura_lv70_jewel_wing_start.png',
    className: 'asset-wing asset-wing-lv70',
    description: '結晶に変わりはじめた羽',
  },
  {
    id: 'aura_lv75_crystal_burst',
    slot: 'wing',
    label: 'クリスタル爆発',
    requiredLv: 75,
    src: '/assets/avatar-aura/aura_lv75_crystal_burst.png',
    className: 'asset-wing asset-crystal-burst',
    description: '高Lvの強い結晶演出',
  },
  {
    id: 'aura_lv80_jewel_wing_premium',
    slot: 'wing',
    label: '推され宝石翼',
    requiredLv: 80,
    src: '/assets/avatar-aura/aura_lv80_jewel_wing_premium.png',
    className: 'asset-wing asset-wing-lv80',
    description: '宝石翼の本命装飾',
  },
  {
    id: 'aura_lv100_legend_wings',
    slot: 'wing',
    label: '殿堂翼',
    requiredLv: 100,
    src: '/assets/avatar-aura/aura_lv100_legend_wings.png',
    className: 'asset-wing asset-wing-legend',
    description: '殿堂用の最終翼',
  },
  {
    id: 'aura_lv85_crown_seed',
    slot: 'crown',
    label: '王冠の芽',
    requiredLv: 85,
    src: '/assets/avatar-aura/aura_lv85_crown_seed.png',
    className: 'asset-crown asset-crown-lv85',
    description: '王冠が生まれはじめる',
  },
  {
    id: 'aura_lv90_small_crown',
    slot: 'crown',
    label: '小さな王冠',
    requiredLv: 90,
    src: '/assets/avatar-aura/aura_lv90_small_crown.png',
    className: 'asset-crown asset-crown-lv90',
    description: 'プロフィール上部の王冠',
  },
  {
    id: 'aura_lv95_crown_aura',
    slot: 'crown',
    label: 'クラウンオーラ',
    requiredLv: 95,
    src: '/assets/avatar-aura/aura_lv95_crown_aura.png',
    className: 'asset-crown asset-crown-lv95',
    description: '王冠と後光の上位装飾',
  },
  {
    id: 'aura_lv100_legend_crown',
    slot: 'crown',
    label: '殿堂の冠',
    requiredLv: 100,
    src: '/assets/avatar-aura/aura_lv100_legend_crown.png',
    className: 'asset-crown asset-crown-legend',
    description: '殿堂用の最終王冠',
  },
  {
    id: 'aura_lv100_front_fx',
    slot: 'front_fx',
    label: '殿堂きらめき',
    requiredLv: 100,
    src: '/assets/avatar-aura/aura_lv100_front_fx.png',
    className: 'asset-front-fx asset-front-fx-legend',
    description: '前景に重ねる最終エフェクト',
  },
]

export function getAvatarDecorationAsset(assetId?: string | null): AvatarDecorationAsset | null {
  if (!assetId || assetId === NONE_DECORATION_VALUE || assetId === AUTO_DECORATION_VALUE) return null
  return AVATAR_DECORATION_ASSETS.find((asset) => asset.id === assetId) ?? null
}

export function getAvatarDecorationAssetsBySlot(slot: AvatarDecorationSlot): AvatarDecorationAsset[] {
  return AVATAR_DECORATION_ASSETS.filter((asset) => asset.slot === slot)
}

export function isAvatarDecorationUnlocked(asset: AvatarDecorationAsset, lv: number): boolean {
  return Number(lv || 0) >= asset.requiredLv
}

export function getDefaultAvatarDecorationAsset(slot: AvatarDecorationSlot, lv: number): AvatarDecorationAsset | null {
  // 前景FXは派手さの好みが分かれるので、自動では出さず手動選択だけにする。
  if (slot === 'front_fx') return null

  const unlocked = getAvatarDecorationAssetsBySlot(slot)
    .filter((asset) => isAvatarDecorationUnlocked(asset, lv))
    .sort((a, b) => b.requiredLv - a.requiredLv)

  return unlocked[0] ?? null
}

export function resolveAvatarDecorationAsset(
  slot: AvatarDecorationSlot,
  selectedAssetId: string | null | undefined,
  lv: number
): AvatarDecorationAsset | null {
  if (selectedAssetId === NONE_DECORATION_VALUE) return null

  const selected = getAvatarDecorationAsset(selectedAssetId)
  if (selected?.slot === slot && isAvatarDecorationUnlocked(selected, lv)) {
    return selected
  }

  return getDefaultAvatarDecorationAsset(slot, lv)
}

export function sanitizeAvatarDecorationSelection(
  slot: AvatarDecorationSlot,
  value: unknown,
  lv: number
): string | null | 'INVALID' {
  if (value == null || value === AUTO_DECORATION_VALUE) return null
  if (value === NONE_DECORATION_VALUE) return NONE_DECORATION_VALUE
  if (typeof value !== 'string') return 'INVALID'

  const asset = getAvatarDecorationAsset(value)
  if (!asset || asset.slot !== slot || !isAvatarDecorationUnlocked(asset, lv)) return 'INVALID'
  return asset.id
}
