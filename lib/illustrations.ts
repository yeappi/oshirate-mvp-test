import { createSupabaseServerClient } from './supabase-server'
import type { IllustrationCard, IllustrationRow, UserIllustrationRow } from './illustrationTypes'

// ============================================================
// getIllustrationCards
// プロフィール表示用のイラストカードを組み立てる。
//
// profileUserId:
//   そのプロフィールの持ち主。所有済み/お気に入り表示はこのユーザー基準。
// viewerUserId:
//   いま見ているログインユーザー。TOP購入者の「あなた」判定に使う。
//
// 表示順:
//   1. プロフィール持ち主の所有済み
//   2. 未所有
//   3. それぞれの中で高額順
//   4. 同価格なら sort_order 小さい順
// ============================================================
export async function getIllustrationCards(
  profileUserId: string,
  viewerUserId: string
): Promise<IllustrationCard[]> {
  const supabase = createSupabaseServerClient()

  // 1. イラスト一覧（activeのみ）
  const { data: illusts, error: illustErr } = await supabase
    .from('illustrations')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: false })
    .order('sort_order', { ascending: true })

  if (illustErr || !illusts) return []

  // 2. プロフィール持ち主の所持状況
  const { data: owned } = await supabase
    .from('user_illustrations')
    .select('illustration_id, quantity')
    .eq('user_id', profileUserId)

  const ownedMap = new Map<string, number>(
    (owned ?? []).map((r: Pick<UserIllustrationRow, 'illustration_id' | 'quantity'>) => [
      r.illustration_id,
      r.quantity,
    ])
  )

  // 3. プロフィール持ち主のお気に入り状況
  const { data: favorites } = await supabase
    .from('user_favorite_illustrations')
    .select('illustration_id, favorite_order')
    .eq('user_id', profileUserId)

  const favoriteMap = new Map<string, number>(
    ((favorites ?? []) as Array<{ illustration_id: string; favorite_order: number }>).map((r) => [
      r.illustration_id,
      r.favorite_order,
    ])
  )

  // 4. TOP購入者判定
  //    viewerUserId が1位なら「あなた」、それ以外の個人名は出さない。
  const illustIds = (illusts as IllustrationRow[]).map((i) => i.id)
  const topBuyerMap = await resolveTopBuyers(supabase, illustIds, viewerUserId)

  // 5. 組み立て
  const cards = (illusts as IllustrationRow[]).map((illust): IllustrationCard => {
    const qty = ownedMap.get(illust.id) ?? 0
    const favoriteOrder = favoriteMap.get(illust.id) ?? null
    const topBuyerLabel = topBuyerMap.get(illust.id) ?? 'なし'
    const canBuyMore = illust.max_per_user === null || qty < illust.max_per_user
    const base = {
      id: illust.id,
      title: illust.title,
      price: illust.price,
      image_url: illust.image_url,
      max_per_user: illust.max_per_user,
      sort_order: illust.sort_order,
      topBuyerLabel,
      isFavorite: favoriteOrder !== null,
      favoriteOrder,
      isSpecial: Boolean(illust.is_special),
      requiresItemTicket: Boolean(illust.requires_item_ticket),
      specialLabel: illust.special_label ?? null,
    }

    if (qty > 0) {
      return {
        ...base,
        owned: true,
        quantity: qty,
        canBuyMore,
      }
    }

    return {
      ...base,
      owned: false,
      canBuy: true, // ptチェックはクライアント側
    }
  })

  return cards.sort(compareIllustrationCards)
}

function compareIllustrationCards(a: IllustrationCard, b: IllustrationCard): number {
  if (a.isSpecial !== b.isSpecial) return a.isSpecial ? -1 : 1
  if (a.owned !== b.owned) return a.owned ? -1 : 1
  if (a.price !== b.price) return b.price - a.price
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return a.title.localeCompare(b.title, 'ja')
}

// ============================================================
// 各イラストのTOP購入者ラベルを解決する
//   '購入なし'   → 'なし'
//   viewer が1位 → 'あなた'
//   他人が1位    → '非公開'
// ============================================================
async function resolveTopBuyers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  illustIds: string[],
  viewerUserId: string
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
    result.set(illustId, topId === viewerUserId ? 'あなた' : '非公開')
  }

  return result
}
