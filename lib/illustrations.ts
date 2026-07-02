import { createSupabaseServerClient } from './supabase-server'
import type { IllustrationCard, IllustrationRow, UserIllustrationRow } from './illustrationTypes'

// ============================================================
// getIllustrationCards
// やぴのプロフィールページで使うイラストカードを組み立てる
//
// 引数:
//   userId     — 現在ログイン中のユーザーID
//   targetId   — やぴの profiles.id
// ============================================================
export async function getIllustrationCards(
  userId: string,
  targetId: string
): Promise<IllustrationCard[]> {
  const supabase = createSupabaseServerClient()

  // 1. イラスト一覧（全件・sort_order昇順）
  const { data: illusts, error: illustErr } = await supabase
    .from('illustrations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (illustErr || !illusts) return []

  // 2. 自分の所持状況
  const { data: owned } = await supabase
    .from('user_illustrations')
    .select('illustration_id, quantity')
    .eq('user_id', userId)

  const ownedMap = new Map<string, number>(
    (owned ?? []).map((r: Pick<UserIllustrationRow, 'illustration_id' | 'quantity'>) => [
      r.illustration_id,
      r.quantity,
    ])
  )

  // 3. TOP購入者判定
  //    illustration_purchases から各イラストのTOP購入者IDを取得
  //    自分かどうかだけ判定すれば良い（他人名は出さない）
  const illustIds = (illusts as IllustrationRow[]).map((i) => i.id)

  // illustration_id ごとに最多購入者のIDを取得（自分かどうかだけわかればいい）
  const topBuyerMap = await resolveTopBuyers(supabase, illustIds, userId)

  // 4. 組み立て
  return (illusts as IllustrationRow[]).map((illust): IllustrationCard => {
    const qty = ownedMap.get(illust.id) ?? 0
    const topBuyerLabel = topBuyerMap.get(illust.id) ?? 'なし'
    const canBuyMore =
      illust.max_per_user === null || qty < illust.max_per_user

    if (qty > 0) {
      return {
        owned: true,
        id: illust.id,
        title: illust.title,
        price: illust.price,
        image_url: illust.image_url,
        max_per_user: illust.max_per_user,
        quantity: qty,
        canBuyMore,
        topBuyerLabel,
      }
    }

    return {
      owned: false,
      id: illust.id,
      title: illust.title,
      price: illust.price,
      image_url: illust.image_url,
      max_per_user: illust.max_per_user,
      canBuy: true, // ptチェックはクライアント側
      topBuyerLabel,
    }
  })
}

// ============================================================
// 各イラストのTOP購入者ラベルを解決する
//   '購入なし'   → 'なし'
//   自分が1位    → 'あなた'
//   他人が1位    → '非公開'
// ============================================================
async function resolveTopBuyers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  illustIds: string[],
  currentUserId: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  if (illustIds.length === 0) return result

  // 購入数の集計: illustration_id + buyer_user_id ごとの count
  const { data } = await supabase
    .from('illustration_purchases')
    .select('illustration_id, buyer_user_id')
    .in('illustration_id', illustIds)

  if (!data || data.length === 0) return result

  // 集計
  type PurchaseEntry = { illustration_id: string; buyer_user_id: string }
  const countMap = new Map<string, Map<string, number>>()

  for (const row of data as PurchaseEntry[]) {
    if (!countMap.has(row.illustration_id)) {
      countMap.set(row.illustration_id, new Map())
    }
    const byBuyer = countMap.get(row.illustration_id)!
    byBuyer.set(row.buyer_user_id, (byBuyer.get(row.buyer_user_id) ?? 0) + 1)
  }

  // TOP購入者の判定
  for (const [illustId, byBuyer] of Array.from(countMap.entries())) {
    let topId = ''
    let topCount = 0
    for (const [buyerId, count] of Array.from(byBuyer.entries())) {
      if (count > topCount) {
        topCount = count
        topId = buyerId
      }
    }
    result.set(illustId, topId === currentUserId ? 'あなた' : '非公開')
  }

  return result
}
