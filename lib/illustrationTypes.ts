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
// owned=true  → quantity, isTopBuyer を持つ
// owned=false → 購入可能かどうかを持つ
// ============================================================
export type IllustrationCard =
  | {
      owned: true
      id: string
      title: string
      price: number
      image_url: string | null
      max_per_user: number | null
      quantity: number
      canBuyMore: boolean      // max_per_user制限に引っかかっていないか
      topBuyerLabel: string    // 'あなた' | '非公開' | 'なし'
    }
  | {
      owned: false
      id: string
      title: string
      price: number
      image_url: string | null
      max_per_user: number | null
      canBuy: boolean          // ptが足りるか（クライアント側で計算）
      topBuyerLabel: string
    }

// ============================================================
// 購入APIレスポンス
// ============================================================
export type PurchaseResult =
  | { ok: true; price: number }
  | { ok: false; error: 'insufficient_points' | 'purchase_limit_reached' | 'illustration_not_found' | 'unknown' }
