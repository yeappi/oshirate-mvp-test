import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getCharmRank, detectRankUp } from '@/lib/rank'
import { getNewlyUnlockedDecorations } from '@/lib/decorations'
import {
  notifyIllustrationPurchased,
  notifyRankUp,
  notifyDecorationUnlocked,
  notifyTagUnlocked,
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
    .select('title, price, reward_tag_id')
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

  const result = data as {
    ok: boolean
    error?: string
    price?: number
    reward_tag_id?: string | null
    reward_tag_granted?: boolean
    level_reward_tag_ids?: string[] | null
  }

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
  // charisma が上がるのは購入対象プロフィールなので、通知先は targetUserId。
  if (rankUp) {
    notifyPromises.push(
      notifyRankUp(targetUserId, rankUp.from, rankUp.to)
        .catch((e) => console.error('[purchase] notify rankup error:', e))
    )
  }

  // 装飾解放通知（ランクアップ時かつ解放された装飾がある場合）
  if (unlockedDecorations.length > 0) {
    notifyPromises.push(
      notifyDecorationUnlocked(
        targetUserId,
        unlockedDecorations.map((d) => d.id),
        unlockedDecorations.map((d) => d.name)
      ).catch((e) => console.error('[purchase] notify decoration error:', e))
    )
  }

  // イラスト購入特典タグ通知（新規獲得時のみ）
  let rewardTag: { id: string; label: string; variant: string } | null = null
  if (result.reward_tag_id && result.reward_tag_granted) {
    const { data: tag } = await supabase
      .from('profile_tags')
      .select('id, label, variant')
      .eq('id', result.reward_tag_id)
      .eq('is_active', true)
      .single()

    if (tag) {
      rewardTag = {
        id: String(tag.id),
        label: String(tag.label),
        variant: String(tag.variant ?? 'mid'),
      }
      notifyPromises.push(
        notifyTagUnlocked(user.id, rewardTag.id, rewardTag.label, 'illustration_purchase')
          .catch((e) => console.error('[purchase] notify tag error:', e))
      )
    }
  }

  // Lv到達報酬タグ通知（新規獲得時のみ）。
  // Lv報酬は購入対象プロフィールの成長報酬なので、通知先は targetUserId。
  const levelRewardTagIds = Array.isArray(result.level_reward_tag_ids)
    ? result.level_reward_tag_ids.filter((id): id is string => typeof id === 'string')
    : []

  if (levelRewardTagIds.length > 0) {
    const { data: levelTags } = await supabase
      .from('profile_tags')
      .select('id, label')
      .in('id', levelRewardTagIds)
      .eq('is_active', true)

    for (const tag of levelTags ?? []) {
      notifyPromises.push(
        notifyTagUnlocked(targetUserId, String(tag.id), String(tag.label), 'level_reward')
          .catch((e) => console.error('[purchase] notify level tag error:', e))
      )
    }
  }

  await Promise.all(notifyPromises)

  return NextResponse.json({
    ok: true,
    price: result.price,
    rankUp,
    unlockedDecorations,
    rewardTag,
  })
}
