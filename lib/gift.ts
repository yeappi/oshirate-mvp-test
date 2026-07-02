// ============================================================
// 抽選テーブル仕様
//   normal (90%): 各スロット 50〜550pt ランダム
//   gold   (10%): 各スロット 1000〜2500pt ランダム
// ============================================================

export type TableType = 'normal' | 'gold'

export type GiftRoll = {
  tableType: TableType
  options: [number, number, number]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function rollOptions(min: number, max: number): [number, number, number] {
  return [randInt(min, max), randInt(min, max), randInt(min, max)]
}

export function rollGiftSlot(): GiftRoll {
  const isGold = Math.random() < 0.1  // 10%

  if (isGold) {
    return {
      tableType: 'gold',
      options: rollOptions(1000, 2500),
    }
  }

  return {
    tableType: 'normal',
    options: rollOptions(50, 550),
  }
}
