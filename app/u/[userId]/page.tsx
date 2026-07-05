import { notFound, redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/auth'
import { getIllustrationCards } from '@/lib/illustrations'
import { getUnreadCount } from '@/lib/notifications'
import { getUserLevel } from '@/lib/level'
import { getProfileBackgroundById } from '@/lib/backgrounds'
import { getAvatarFrameById } from '@/lib/avatarFrames'
import { getProfileDisplayTags } from '@/lib/tags'
import { getCharismaRanking } from '@/lib/ranking'
import { isFollowingUser } from '@/lib/follows'
import { yapyProfile } from '@/lib/staticData'
import ProfileCard from '@/components/profile/ProfileCard'
import BottomNav from '@/components/layout/BottomNav'
import FollowButton from '@/components/follow/FollowButton'

type Props = {
  params: { userId: string }
}

export default async function PublicProfilePage({ params }: Props) {
  const user = await getUser()
  if (!user) redirect('/login')

  const targetUserId = params.userId
  if (targetUserId === user.id) redirect('/')

  const [viewerProfile, targetProfile, unreadCount, displayTags, isFollowing, ranking] = await Promise.all([
    getProfile(user.id),
    getProfile(targetUserId),
    getUnreadCount(user.id),
    getProfileDisplayTags(targetUserId),
    isFollowingUser(user.id, targetUserId),
    getCharismaRanking(targetUserId),
  ])

  if (!targetProfile) notFound()

  const [cards, selectedBackground, selectedAvatarFrame] = await Promise.all([
    getIllustrationCards(targetUserId, user.id),
    getProfileBackgroundById(targetProfile.selected_background_id),
    getAvatarFrameById(targetProfile.selected_avatar_frame_id),
  ])

  const userLevel = getUserLevel(targetProfile.charisma ?? 0)
  const viewerPoints = viewerProfile?.points ?? 0

  const mergedProfile = {
    ...yapyProfile,
    name: targetProfile.name ?? '名無し',
    photoUrl: targetProfile.avatar_url ?? null,
    comment: targetProfile.profile_comment ?? 'まだコメントはありません。',
    tags: displayTags.map((tag) => ({ label: tag.label, variant: tag.variant })),
    stats: {
      ...yapyProfile.stats,
      ranking: ranking.rank,
      rankingTotal: ranking.total.toLocaleString(),
      charisma: Number(targetProfile.charisma ?? 0).toLocaleString(),
    },
  }

  return (
    <div className="profile-theme-page" data-profile-bg={selectedBackground?.css_key ?? 'starter'}>
      <div style={{ paddingBottom: 64 }}>
        <ProfileCard
          profile={mergedProfile}
          cards={cards}
          userPoints={viewerPoints}
          targetUserId={targetUserId}
          userLevel={userLevel}
          selectedBackground={selectedBackground}
          selectedAvatarFrame={selectedAvatarFrame}
          showUserPoints={false}
          isPublicView
          editLink={<FollowButton targetUserId={targetUserId} initialFollowing={isFollowing} compact />}
        />
      </div>
      <BottomNav unreadCount={unreadCount} />
    </div>
  )
}
