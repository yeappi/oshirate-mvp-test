import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { getFollowingProfiles } from '@/lib/follows'
import { getUnreadCount } from '@/lib/notifications'
import BottomNav from '@/components/layout/BottomNav'
import UserListCard from '@/components/follow/UserListCard'

export default async function FollowingPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profiles, unreadCount] = await Promise.all([
    getFollowingProfiles(user.id),
    getUnreadCount(user.id),
  ])

  return (
    <>
      <main className="app" style={{ paddingBottom: 84 }}>
        <section className="collection-card" style={{ marginTop: 10 }}>
          <div className="collection-head">
            <div className="collection-title">FOLLOWING</div>
            <div className="collection-count">{profiles.length}</div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {profiles.map((p) => (
              <UserListCard key={p.id} profile={p} />
            ))}
            {profiles.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700, lineHeight: 1.8 }}>
                まだフォロー中のユーザーはいません。探す画面から「開発者：やぴ」をフォローできます。
              </div>
            )}
          </div>
        </section>
      </main>
      <BottomNav unreadCount={unreadCount} />
    </>
  )
}
