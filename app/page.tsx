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
import { getCharismaRanking } from '@/lib/ranking'
import ProfileCard from '@/components/profile/ProfileCard'
import GiftBox from '@/components/gift/GiftBox'
import BottomNav from '@/components/layout/BottomNav'
import { GuideButton } from '@/components/guide/GuideModal'

export default async function HomePage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, cards, activeDecorations, unreadCount, displayTags, ranking] = await Promise.all([
    getProfile(user.id),
    getIllustrationCards(user.id, user.id),
    getActiveDecorations(user.id),
    getUnreadCount(user.id),
    getProfileDisplayTags(user.id),
    getCharismaRanking(user.id),
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
      ranking: ranking.rank,
      rankingTotal: ranking.total.toLocaleString(),
      charisma: Number(profile?.charisma ?? 0).toLocaleString(),
    },
  }

  return (
    <div className="profile-theme-page" data-profile-bg={selectedBackground?.css_key ?? 'starter'}>
      <GuideButton kind="main" className="page-guide-button" />
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
          giftBox={<GiftBox />}
          editLink={
            <Link href="/profile/edit" className="profile-edit-icon" aria-label="プロフィールを編集">
              ✎
            </Link>
          }
        />
      </div>
      <BottomNav unreadCount={unreadCount} />
    </div>
  )
}
