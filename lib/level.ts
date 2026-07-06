// ============================================================
// Lv / 魅力値計算
// charisma の値から Lv1〜Lv100 を算出する。
//
// 報酬軸の役割:
// - charisma / Lv: 推されている証。アイコンフレーム・羽・王冠などの格演出に使う。
// - total_spent_points: 応援した証。背景・タグ・名前横マークなどのカスタム解放に使う。
// ============================================================

type LevelAnchor = { lv: number; required: number }

const LEVEL_ANCHORS: LevelAnchor[] = [
  { lv: 1, required: 0 },
  { lv: 10, required: 2500 },
  { lv: 20, required: 10000 },
  { lv: 30, required: 30000 },
  { lv: 40, required: 60000 },
  { lv: 50, required: 100000 },
  { lv: 60, required: 180000 },
  { lv: 70, required: 300000 },
  { lv: 80, required: 500000 },
  { lv: 90, required: 750000 },
  { lv: 100, required: 1000000 },
]

function roundRequirement(value: number): number {
  if (value < 10000) return Math.round(value / 100) * 100
  if (value < 100000) return Math.round(value / 1000) * 1000
  return Math.round(value / 10000) * 10000
}

function buildLevelTable(): { lv: number; required: number }[] {
  const table: { lv: number; required: number }[] = []

  for (let i = 0; i < LEVEL_ANCHORS.length - 1; i++) {
    const start = LEVEL_ANCHORS[i]
    const end = LEVEL_ANCHORS[i + 1]
    const lvSpan = end.lv - start.lv
    const valueSpan = end.required - start.required

    for (let lv = start.lv; lv < end.lv; lv++) {
      const ratio = (lv - start.lv) / lvSpan
      const required = lv === 1 ? 0 : roundRequirement(start.required + valueSpan * ratio)
      table.push({ lv, required })
    }
  }

  table.push(LEVEL_ANCHORS[LEVEL_ANCHORS.length - 1])
  return table
}

// Lv ごとの必要 charisma（累積値）
export const LEVEL_TABLE: { lv: number; required: number }[] = buildLevelTable()

export const MAX_LEVEL = 100

// Lv帯名。名称は今後の世界観整理で差し替える前提の仮名。
export function getLevelTierName(lv: number): string {
  if (lv >= 100) return '殿堂'
  if (lv >= 80) return '王冠'
  if (lv >= 60) return '宝石の羽'
  if (lv >= 40) return 'きらめき'
  if (lv >= 20) return '羽ばたき'
  return 'はじまり'
}

// CSS tier 識別子（プロフィール背景や将来の素材レイヤーで使う）
export type LevelTier = 'base' | 'frame' | 'wing' | 'motion' | 'jewel' | 'crown' | 'legend'

export function getLevelTier(lv: number): LevelTier {
  if (lv >= 100) return 'legend'
  if (lv >= 80) return 'crown'
  if (lv >= 60) return 'jewel'
  if (lv >= 40) return 'motion'
  if (lv >= 20) return 'wing'
  return 'frame'
}

export type AvatarAuraTier = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function getAvatarAuraTier(lv: number): AvatarAuraTier {
  if (lv >= 100) return 6
  if (lv >= 80) return 5
  if (lv >= 60) return 4
  if (lv >= 40) return 3
  if (lv >= 20) return 2
  if (lv >= 1) return 1
  return 0
}

// Lv報酬テーブル。
// 背景・タグは累計使用pt側へ移すため、ここでは魅力値側の格演出だけを表示する。
export type LevelRewardKind = 'avatar'

export type LevelReward = {
  lv: number
  kind: LevelRewardKind
  label: string
  detail: string
  rewardId: string
}

export const LEVEL_REWARDS: LevelReward[] = [
  { lv: 20, kind: 'avatar', label: 'アイコン装飾', detail: '羽ばたきの装飾枠', rewardId: 'aura_wing_start' },
  { lv: 40, kind: 'avatar', label: 'アイコン装飾', detail: '動的フレームの土台', rewardId: 'aura_motion_frame' },
  { lv: 60, kind: 'avatar', label: 'アイコン装飾', detail: '宝石羽の土台', rewardId: 'aura_jewel_wing' },
  { lv: 80, kind: 'avatar', label: 'アイコン装飾', detail: '王冠装飾の土台', rewardId: 'aura_crown_start' },
  { lv: 100, kind: 'avatar', label: 'アイコン装飾', detail: '殿堂オーラの土台', rewardId: 'aura_legend' },
]

// ============================================================
// Lv 情報を返す
// ============================================================
export type UserLevel = {
  lv: number
  tierName: string
  tier: LevelTier
  avatarAuraTier: AvatarAuraTier
  currentRequired: number
  nextRequired: number | null
  progress: number
  isMax: boolean
}

export function getUserLevel(charisma: number): UserLevel {
  const safeCharisma = Math.max(0, Number(charisma || 0))

  let current = LEVEL_TABLE[0]
  for (const entry of LEVEL_TABLE) {
    if (safeCharisma >= entry.required) current = entry
    else break
  }

  const lv = current.lv
  const currentRequired = current.required
  const isMax = lv >= MAX_LEVEL

  const nextEntry = isMax ? null : LEVEL_TABLE.find((e) => e.lv === lv + 1) ?? null
  const nextRequired = nextEntry?.required ?? null

  const progress = isMax
    ? 1
    : nextRequired !== null && nextRequired > currentRequired
      ? Math.min((safeCharisma - currentRequired) / (nextRequired - currentRequired), 1)
      : 0

  return {
    lv,
    tierName: getLevelTierName(lv),
    tier: getLevelTier(lv),
    avatarAuraTier: getAvatarAuraTier(lv),
    currentRequired,
    nextRequired,
    progress,
    isMax,
  }
}
