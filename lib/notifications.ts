import { createSupabaseServerClient } from './supabase-server'

// ============================================================
// 通知タイプ
// ============================================================
export type NotificationType =
  | 'gift_claimed'
  | 'illustration_purchased'
  | 'rank_up'
  | 'decoration_unlocked'

// ============================================================
// DB 行型
// ============================================================
export type NotificationRow = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  metadata: NotificationMetadata | null
  is_read: boolean
  created_at: string
}

// ============================================================
// metadata の型（タイプ別）
// ============================================================
export type NotificationMetadata =
  | { type: 'gift_claimed';              point: number; tableType: 'normal' | 'gold' }
  | { type: 'illustration_purchased';    illustrationId: string; illustrationTitle: string; price: number }
  | { type: 'rank_up';                   rankBefore: number; rankAfter: number }
  | { type: 'decoration_unlocked';       decorationIds: string[]; decorationNames: string[] }

// ============================================================
// 通知生成ヘルパー（サーバー側専用 — RPC 経由で insert）
// ============================================================

export async function notifyGiftClaimed(
  userId: string,
  point: number,
  tableType: 'normal' | 'gold'
) {
  const supabase = createSupabaseServerClient()
  await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type:    'gift_claimed',
    p_title:   `${point.toLocaleString()}pt を受け取りました`,
    p_body:    tableType === 'gold' ? '✦ ゴールドプレゼントでした' : null,
    p_metadata: { type: 'gift_claimed', point, tableType },
  })
}

export async function notifyIllustrationPurchased(
  userId: string,
  illustrationId: string,
  illustrationTitle: string,
  price: number
) {
  const supabase = createSupabaseServerClient()
  await supabase.rpc('create_notification', {
    p_user_id:  userId,
    p_type:     'illustration_purchased',
    p_title:    `「${illustrationTitle}」を購入しました`,
    p_body:     `${price.toLocaleString()}pt`,
    p_metadata: { type: 'illustration_purchased', illustrationId, illustrationTitle, price },
  })
}

export async function notifyRankUp(
  userId: string,
  rankBefore: number,
  rankAfter: number
) {
  const supabase = createSupabaseServerClient()
  await supabase.rpc('create_notification', {
    p_user_id:  userId,
    p_type:     'rank_up',
    p_title:    `ランク${rankBefore} から ランク${rankAfter} に上がりました`,
    p_body:     '新しい装飾が解放されました',
    p_metadata: { type: 'rank_up', rankBefore, rankAfter },
  })
}

export async function notifyDecorationUnlocked(
  userId: string,
  decorationIds: string[],
  decorationNames: string[]
) {
  if (decorationIds.length === 0) return
  const supabase = createSupabaseServerClient()
  await supabase.rpc('create_notification', {
    p_user_id:  userId,
    p_type:     'decoration_unlocked',
    p_title:    '新しい装飾が解放されました',
    p_body:     decorationNames.join('、'),
    p_metadata: { type: 'decoration_unlocked', decorationIds, decorationNames },
  })
}

// ============================================================
// 未読数を取得（ホームの導線バッジ用）
// ============================================================
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

// ============================================================
// 通知一覧取得（最新50件）
// ============================================================
export async function getNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as NotificationRow[]
}
