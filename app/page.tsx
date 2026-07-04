import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { getIllustrationCards } from '@/lib/illustrations'
import { getActiveDecorations } from '@/lib/decorations'
import { getUnreadCount } from '@/lib/notifications'
import { yapyProfile } from '@/lib/staticData'
import { getUserLevel } from '@/lib/level'
import { getProfileBackgroundById } from '@/lib/backgrounds'
import { getAvatarFrameById } from '@/lib/avatarFrames'
import { getProfileDisplayTags } from '@/lib/tags'
import ProfileCard from '@/components/profile/ProfileCard'
import LogoutButton from '@/components/auth/LogoutButton'
import GiftBox from '@/components/gift/GiftBox'
import BottomNav from '@/components/layout/BottomNav'

export default async function HomePage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, cards, activeDecorations, unreadCount, displayTags] = await Promise.all([
    getProfile(user.id),
    getIllustrationCards(user.id, user.id),
    getActiveDecorations(user.id),
    getUnreadCount(user.id),
    getProfileDisplayTags(user.id),
  ])

  const userPoints = profile?.points ?? 0
  const userLevel = getUserLevel(profile?.charisma ?? 0)
  const [selectedBackground, selectedAvatarFrame] = await Promise.all([
    getProfileBackgroundById(profile?.selected_background_id),
    getAvatarFrameById(profile?.selected_avatar_frame_id),
  ])

  // ======================================================
  // mergedProfile: DBのユーザー情報を優先し、未設定項目は
  // yapyProfile (静的データ) をfallbackとして使う。
  //
  // 今後の拡張予定:
  //   - tags      → profile_display_tags から取得した表示タグを使う
  //   - rank      → charismaベースのLv計算に差し替え
  //   - badges    → 解放報酬に差し替え
  //   - stats     → DB集計値に差し替え
  //   - favorites → 購入履歴ベースに差し替え
  // ======================================================
  const mergedProfile = {
    // yapyProfile の静的項目を初期値として展開
    ...yapyProfile,
    // DBのユーザー情報で上書き（未設定時は静的データを維持）
    name:     profile?.name            ?? yapyProfile.name,
    photoUrl: profile?.avatar_url      ?? yapyProfile.photoUrl,
    comment:  profile?.profile_comment ?? yapyProfile.comment,
    tags: displayTags.map((tag) => ({ label: tag.label, variant: tag.variant })),
    // stats.charisma は DB の実値を表示用にフォーマット
    // rank は ProfileCard 側で userLevel.tierName に一本化済みのため静的値のまま残す（表示には使わない）
    stats: {
      ...yapyProfile.stats,
      charisma: Number(profile?.charisma ?? 0).toLocaleString(),
    },
  }

  return (
    <>
      <div style={{ paddingBottom: 64 }}>
        <ProfileCard
          profile={mergedProfile}
          cards={cards}
          userPoints={userPoints}
          targetUserId={user.id}
          userLevel={userLevel}
          selectedBackground={selectedBackground}
          selectedAvatarFrame={selectedAvatarFrame}
          activeDecorations={activeDecorations}
          logoutButton={<LogoutButton />}
          giftBox={<GiftBox />}
          editLink={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <Link href="/profile/edit" style={{
                fontSize: 10,
                color: 'var(--ink-faint)',
                textDecoration: 'none',
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '0.08em',
              }}>
                編集
              </Link>
              <Link href="/profile/background" style={{
                fontSize: 10,
                color: 'var(--ink-faint)',
                textDecoration: 'none',
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '0.08em',
              }}>
                背景
              </Link>
              <Link href="/profile/frame" style={{
                fontSize: 10,
                color: 'var(--ink-faint)',
                textDecoration: 'none',
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '0.08em',
              }}>
                枠
              </Link>
              <Link href="/profile/tags" style={{
                fontSize: 10,
                color: 'var(--ink-faint)',
                textDecoration: 'none',
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '0.08em',
              }}>
                タグ
              </Link>
            </div>
          }
        />
      </div>
      <BottomNav unreadCount={unreadCount} />
    </>
  )
}
