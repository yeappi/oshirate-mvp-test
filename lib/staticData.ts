// Phase 0〜: やぴプロフィールの静的データ
// illustrations は Phase 2 で Supabase DB に移行済み

export type TagVariant = 'rare' | 'high' | 'mid' | 'low'

export type Tag = {
  label: string
  variant: TagVariant
}

export type Badge = {
  name: string
  isLead?: boolean
}

export type FavoriteItem = {
  count: number
}

export type Supporter = {
  rank: number
  name: string
  points: string
  isFirst?: boolean
}

export type ProfileData = {
  name: string
  rank: string
  comment: string
  photoUrl: string | null
  tags: Tag[]
  badges: Badge[]
  stats: {
    ranking: number
    rankingTotal: string
    charisma: string
  }
  favorites: FavoriteItem[]
  topSupporters: Supporter[]
  metrics: {
    totalSupporters: string
    totalGifts: string
    daily: string
    illustOwned: string
  }
}

// やぴプロフィール（表示用静的データ）
// stats / metrics は Phase 3以降でDB連携予定
export const yapyProfile: ProfileData = {
  name: 'やぴ',
  rank: '赤帯 VIII',
  comment: '今日も見つけてくれてありがとう。\nここが、わたしのいちばん光る場所。',
  photoUrl: '/img/yapi.jpeg',
  tags: [
    { label: '赤遠のセンター', variant: 'rare' },
    { label: '神推し認定', variant: 'high' },
    { label: '伝説のアイコン', variant: 'mid' },
    { label: '最高の座', variant: 'low' },
  ],
  badges: [
    { name: '称号1' },
    { name: '称号2' },
    { name: '称号3', isLead: true },
    { name: '称号4' },
    { name: '称号5' },
  ],
  stats: {
    ranking: 1,
    rankingTotal: '10,532',
    charisma: '12,483,921',
  },
  favorites: [
    { count: 12 },
    { count: 8 },
    { count: 24 },
  ],
  topSupporters: [
    { rank: 2, name: 'ゆうと', points: '1,876,450' },
    { rank: 1, name: 'りん', points: '2,348,710pt', isFirst: true },
    { rank: 3, name: 'あや', points: '1,420,990' },
  ],
  metrics: {
    totalSupporters: '5,432人',
    totalGifts: '¥8,765,432',
    daily: '86,752pt',
    illustOwned: '143枚',
  },
}

// やぴの Supabase profiles.id
// Supabase Dashboard > Authentication > Users で確認後にここに入力
// Phase 2 の購入処理で target_user_id として使う
export const YAPI_USER_ID = process.env.NEXT_PUBLIC_YAPI_USER_ID ?? ''
