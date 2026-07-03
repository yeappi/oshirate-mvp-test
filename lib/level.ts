// ============================================================
// Lv / ランク計算
// charisma の値から Lv1〜Lv20 を算出する
// ============================================================

// Lv ごとの必要 charisma（累積値）
export const LEVEL_TABLE: { lv: number; required: number }[] = [
  { lv:  1, required:     0 },
  { lv:  2, required:    10 },
  { lv:  3, required:    30 },
  { lv:  4, required:    60 },
  { lv:  5, required:   100 },
  { lv:  6, required:   160 },
  { lv:  7, required:   240 },
  { lv:  8, required:   340 },
  { lv:  9, required:   460 },
  { lv: 10, required:   600 },
  { lv: 11, required:   780 },
  { lv: 12, required:  1000 },
  { lv: 13, required:  1260 },
  { lv: 14, required:  1560 },
  { lv: 15, required:  1900 },
  { lv: 16, required:  2300 },
  { lv: 17, required:  2760 },
  { lv: 18, required:  3280 },
  { lv: 19, required:  3860 },
  { lv: 20, required:  4500 },
]

export const MAX_LEVEL = 20

// Lv ごとのランク名
export function getLevelTierName(lv: number): string {
  if (lv >= 20) return '殿堂入り'
  if (lv >= 15) return '推され星'
  if (lv >= 10) return '注目株'
  if (lv >= 5)  return 'きらめき'
  return 'はじまり'
}

// CSS tier 識別子（グロー装飾の className で使う）
export type LevelTier = 'base' | 'glow' | 'glow-strong' | 'special' | 'max'

export function getLevelTier(lv: number): LevelTier {
  if (lv >= 20) return 'max'
  if (lv >= 15) return 'special'
  if (lv >= 10) return 'glow-strong'
  if (lv >= 5)  return 'glow'
  return 'base'
}

// 報酬テーブル（仮。後で実際の報酬IDを紐付け）
export type LevelReward = {
  lv: number
  label: string
}

export const LEVEL_REWARDS: LevelReward[] = [
  { lv:  2, label: 'タグ解放予定' },
  { lv:  3, label: '背景解放予定' },
  { lv:  5, label: '特別タグ予定' },
  { lv: 10, label: '特別背景予定' },
  { lv: 15, label: 'プロフィール装飾予定' },
  { lv: 20, label: '限定背景 + 限定タグ予定' },
]

// ============================================================
// Lv 情報を返す
// ============================================================
export type UserLevel = {
  lv: number
  tierName: string
  tier: LevelTier
  currentRequired: number   // 現Lv到達に必要だった累積値
  nextRequired: number | null  // 次Lvに必要な累積値（Lv20なら null）
  progress: number          // 現Lv内進捗 0.0〜1.0
  isMax: boolean
}

export function getUserLevel(charisma: number): UserLevel {
  // 現在の Lv を求める（テーブルを後ろから検索）
  let current = LEVEL_TABLE[0]
  for (const entry of LEVEL_TABLE) {
    if (charisma >= entry.required) current = entry
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
      ? Math.min((charisma - currentRequired) / (nextRequired - currentRequired), 1)
      : 0

  return {
    lv,
    tierName: getLevelTierName(lv),
    tier: getLevelTier(lv),
    currentRequired,
    nextRequired,
    progress,
    isMax,
  }
}
