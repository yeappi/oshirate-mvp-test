// ============================================================
// 装飾スロット定義
// プロフィール上で素材を差し込める場所
// ============================================================
export type DecorationSlot =
  | 'profile_background'
  | 'avatar_around'
  | 'avatar_frame'
  | 'above_name'
  | 'comment_decoration'

export const DECORATION_SLOTS: DecorationSlot[] = [
  'profile_background',
  'avatar_around',
  'avatar_frame',
  'above_name',
  'comment_decoration',
]

export const SLOT_LABEL: Record<DecorationSlot, string> = {
  profile_background: 'プロフィール背景',
  avatar_around: 'アイコン周り',
  avatar_frame: 'アイコンフレーム',
  above_name: '名前の上',
  comment_decoration: 'コメント装飾',
}

// ============================================================
// 素材型（profile_decorations テーブルに対応）
// ============================================================
export type DecorationAssetType = 'svg' | 'png' | 'webp'

export type Decoration = {
  id: string
  name: string
  description: string | null
  slot: DecorationSlot
  asset_url: string | null      // null = 仮データ / SVG未制作
  asset_type: DecorationAssetType
  required_rank: number
  is_active: boolean
}

// ============================================================
// ユーザーが現在選んでいる装飾マップ
// ProfileCard に渡す形
// ============================================================
export type ActiveDecorations = {
  profile_background?: Decoration
  avatar_around?: Decoration
  avatar_frame?: Decoration
  above_name?: Decoration
  comment_decoration?: Decoration
}

// ============================================================
// user_profile_decorations テーブルの行型
// ============================================================
export type UserProfileDecorationRow = {
  id: string
  user_id: string
  slot: DecorationSlot
  decoration_id: string
  created_at: string
  updated_at: string
}
