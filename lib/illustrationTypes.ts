// ============================================================
// DB の illustrations テーブルに対応する型
// ============================================================
export type IllustrationRow = {
  id: string
  title: string
  description: string | null
  price: number
  image_url: string | null
  max_per_user: number | null
  reward_tag_id: string | null
  is_special: boolean
  requires_item_ticket: boolean
  special_label: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================
// user_illustrations テーブル
// ============================================================
export type UserIllustrationRow = {
  id: string
  user_id: string
  illustration_id: string
  quantity: number
  created_at: string
  updated_at: string
}

// ============================================================
// フロントで使う統合型
// owned=true  → quantity, is_favorite を持つ
// owned=false → 購入可能かどうかを持つ
// ============================================================
type IllustrationCardBase = {
  id: string
  title: string
  price: number
  image_url: string | null
  max_per_user: number | null
  sort_order: number
  topBuyerLabel: string
  isFavorite: boolean
  favoriteOrder: number | null
  isSpecial: boolean
  requiresItemTicket: boolean
  specialLabel: string | null
}

export type IllustrationCard =
  | (IllustrationCardBase & {
      owned: true
      quantity: number
      canBuyMore: boolean      // max_per_user制限に引っかかっていないか
    })
  | (IllustrationCardBase & {
      owned: false
      canBuy: boolean          // ptが足りるか（クライアント側で計算）
    })

// ============================================================
// 購入APIレスポンス
// ============================================================
export type PurchaseResult =
  | {
      ok: true
      price: number
      rewardTag?: { id: string; label: string; variant: string } | null
    }
  | { ok: false; error: 'insufficient_points' | 'purchase_limit_reached' | 'illustration_not_found' | 'requires_item_ticket' | 'unknown' }
