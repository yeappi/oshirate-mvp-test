import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/auth'
import { getIllustrationCards } from '@/lib/illustrations'
import { getActiveDecorations } from '@/lib/decorations'
import { getUnreadCount } from '@/lib/notifications'
import { yapyProfile, YAPI_USER_ID } from '@/lib/staticData'
import ProfileCard from '@/components/profile/ProfileCard'
import LogoutButton from '@/components/auth/LogoutButton'
import GiftBox from '@/components/gift/GiftBox'
import BottomNav from '@/components/layout/BottomNav'

export default async function HomePage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, cards, activeDecorations, unreadCount] = await Promise.all([
    getProfile(user.id),
    YAPI_USER_ID ? getIllustrationCards(user.id, YAPI_USER_ID) : Promise.resolve([]),
    getActiveDecorations(user.id),
    getUnreadCount(user.id),
  ])

  const userPoints = profile?.points ?? 0

  return (
    <>
      {/* BottomNav 分の余白 */}
      <div style={{ paddingBottom: 64 }}>
        <ProfileCard
          profile={yapyProfile}
          cards={cards}
          userPoints={userPoints}
          targetUserId={YAPI_USER_ID}
          activeDecorations={activeDecorations}
          logoutButton={<LogoutButton />}
          giftBox={<GiftBox />}
        />
      </div>
      <BottomNav unreadCount={unreadCount} />
    </>
  )
}
