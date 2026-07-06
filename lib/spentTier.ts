export type SpentTierColor = 'white' | 'blue' | 'green' | 'red' | 'gold'

export type SpentTier = {
  color: SpentTierColor
  step: 1 | 2 | 3 | 4 | 5
  roman: 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ' | 'Ⅴ'
  label: string
  className: string
  required: number
}

const ROMANS: SpentTier['roman'][] = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ']

const SPENT_TIER_TABLE: Array<{ color: SpentTierColor; required: number }>[] = [
  [
    { color: 'white', required: 0 },
    { color: 'white', required: 100 },
    { color: 'white', required: 300 },
    { color: 'white', required: 600 },
    { color: 'white', required: 1000 },
  ],
  [
    { color: 'blue', required: 1500 },
    { color: 'blue', required: 2500 },
    { color: 'blue', required: 4000 },
    { color: 'blue', required: 6500 },
    { color: 'blue', required: 10000 },
  ],
  [
    { color: 'green', required: 15000 },
    { color: 'green', required: 25000 },
    { color: 'green', required: 40000 },
    { color: 'green', required: 65000 },
    { color: 'green', required: 100000 },
  ],
  [
    { color: 'red', required: 140000 },
    { color: 'red', required: 190000 },
    { color: 'red', required: 250000 },
    { color: 'red', required: 330000 },
    { color: 'red', required: 450000 },
  ],
  [
    { color: 'gold', required: 550000 },
    { color: 'gold', required: 650000 },
    { color: 'gold', required: 760000 },
    { color: 'gold', required: 880000 },
    { color: 'gold', required: 1000000 },
  ],
]

export const SPENT_TIERS: SpentTier[] = SPENT_TIER_TABLE.flatMap((group) =>
  group.map((entry, index) => ({
    color: entry.color,
    step: (index + 1) as SpentTier['step'],
    roman: ROMANS[index],
    label: `${entry.color}-${ROMANS[index]}`,
    className: `spent-${entry.color} spent-step-${index + 1}`,
    required: entry.required,
  }))
)

export function getSpentTier(totalSpentPoints: number): SpentTier {
  const spent = Math.max(0, Number(totalSpentPoints || 0))
  let current = SPENT_TIERS[0]
  for (const tier of SPENT_TIERS) {
    if (spent >= tier.required) current = tier
    else break
  }
  return current
}
