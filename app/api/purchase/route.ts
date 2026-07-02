import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getCharmRank, detectRankUp } from '@/lib/rank'
import { getNewlyUnlockedDecorations } from '@/lib/decorations'
import {
  notifyIllustrationPurchased,
  notifyRankUp,
  notifyDecorationUnlocked,
} from '@/lib/notifications'

// ============================================================
// POST /api/purchase
// body: { illustrationId: string, targetUserId: string }
// response: { ok, price, rankUp?, unlockedDecorations? }
// ============================================================
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { illustrationId, targetUserId } = body as {
    illustrationId: string
    targetUserId: string
  }

  if (typeof illustrationId !== 'string' || typeof targetUserId !== 'string') {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  // イラスト情報を取得（通知タイトル用）
  const { data: illust } = await supabase
    .from('illustrations')
    .select('title, price')
    .eq('id', illustrationId)
    .single()

  // 購入前のやぴの魅力度（ランクアップ判定用）
  const { data: targetBefore } = await supabase
    .from('profiles')
    .select('charisma')
    .eq('id', targetUserId)
    .single()

  const charmBefore = targetBefore?.charisma ?? 0

  // 購入実行
  const { data, error } = await supabase.rpc('purchase_illustration', {
    p_buyer_id: user.id,
    p_target_id: targetUserId,
    p_illust_id: illustrationId,
  })

  if (error) {
    console.error('[purchase POST] rpc error:', error)
    return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
  }

  const result = data as { ok: boolean; error?: string; price?: number }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  // 購入後のやぴの魅力度
  const { data: targetAfter } = await supabase
    .from('profiles')
    .select('charisma')
    .eq('id', targetUserId)
    .single()

  const charmAfter = targetAfter?.charisma ?? 0
  const rankUp = detectRankUp(charmBefore, charmAfter)
  const unlockedDecorations = rankUp
    ? await getNewlyUnlockedDecorations(rankUp.to)
    : []

  // === 通知生成（全て fire-and-forget: 失敗しても購入は成立） ===
  const notifyPromises: Promise<void>[] = []

  // イラスト購入通知
  if (illust) {
    notifyPromises.push(
      notifyIllustrationPurchased(user.id, illustrationId, illust.title, illust.price)
        .catch((e) => console.error('[purchase] notify illust error:', e))
    )
  }

  // ランクアップ通知
  if (rankUp) {
    notifyPromises.push(
      notifyRankUp(user.id, rankUp.from, rankUp.to)
        .catch((e) => console.error('[purchase] notify rankup error:', e))
    )
  }

  // 装飾解放通知（ランクアップ時かつ解放された装飾がある場合）
  if (unlockedDecorations.length > 0) {
    notifyPromises.push(
      notifyDecorationUnlocked(
        user.id,
        unlockedDecorations.map((d) => d.id),
        unlockedDecorations.map((d) => d.name)
      ).catch((e) => console.error('[purchase] notify decoration error:', e))
    )
  }

  await Promise.all(notifyPromises)

  return NextResponse.json({
    ok: true,
    price: result.price,
    rankUp,
    unlockedDecorations,
  })
}
