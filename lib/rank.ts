// ============================================================
// ランク計算
// 基準: ランク1 = 500pt から、×1.5 ずつ増加
//
// ランク | 必要魅力度
//   1   |     500
//   2   |     750
//   3   |    1125
//   4   |    1687
//   5   |    2530
//   ...
// ============================================================

const BASE_REQUIRED = 500
const GROWTH_RATE = 1.5

// ランクNの「昇格に必要な魅力度合計」を返す
export function requiredForRank(rank: number): number {
  if (rank <= 1) return 0
  // ランク2になるには500、ランク3には750... の累積ではなく、
  // そのランクに「到達するための閾値」として扱う
  // ランク2閾値 = 500, ランク3 = 750, ランク4 = 1125...
  return Math.floor(BASE_REQUIRED * Math.pow(GROWTH_RATE, rank - 2))
}

export type CharmRank = {
  rank: number
  currentRequired: number  // 現ランクに到達するのに必要だった値
  nextRequired: number     // 次ランクに必要な値（絶対値）
  progress: number         // 現ランク内での進捗 0.0〜1.0
}

export function getCharmRank(charmPoint: number): CharmRank {
  // 何ランク目かを求める
  let rank = 1
  while (true) {
    const next = requiredForRank(rank + 1)
    if (charmPoint < next) break
    rank++
    // 上限は設けない（実験中は際限なく上がる）
    if (rank > 100) break
  }

  const currentRequired = requiredForRank(rank)
  const nextRequired = requiredForRank(rank + 1)

  // 現ランク内での進捗
  const progress =
    (charmPoint - currentRequired) / (nextRequired - currentRequired)

  return {
    rank,
    currentRequired,
    nextRequired,
    progress: Math.min(Math.max(progress, 0), 1),
  }
}

// 購入後のランクアップ判定
// 購入前後の魅力度を渡すと、上がったランクを返す（上がってなければ null）
export function detectRankUp(
  charmBefore: number,
  charmAfter: number
): { from: number; to: number } | null {
  const before = getCharmRank(charmBefore)
  const after = getCharmRank(charmAfter)
  if (after.rank > before.rank) {
    return { from: before.rank, to: after.rank }
  }
  return null
}
