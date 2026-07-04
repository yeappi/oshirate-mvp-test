import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/auth'
import { getDiscoverProfiles } from '@/lib/follows'
import { getUnreadCount } from '@/lib/notifications'
import BottomNav from '@/components/layout/BottomNav'
import UserListCard from '@/components/follow/UserListCard'

export default async function DiscoverPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, unreadCount] = await Promise.all([
    getProfile(user.id),
    getUnreadCount(user.id),
  ])

  const profiles = await getDiscoverProfiles(user.id, Boolean(profile?.is_admin))

  return (
    <>
      <main className="app" style={{ paddingBottom: 84 }}>
        <section className="collection-card" style={{ marginTop: 10 }}>
          <div className="collection-head">
            <div className="collection-title">DISCOVER</div>
            <div className="collection-count">{profiles.length}</div>
          </div>

          <input
            aria-label="ユーザー検索"
            placeholder="ユーザー名で検索"
            disabled
            style={{
              width: '100%',
              border: '1px solid var(--hair-strong)',
              background: 'rgba(255,255,255,0.72)',
              padding: '12px 13px',
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--ink-faint)',
              outline: 'none',
              marginBottom: 12,
            }}
          />
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, lineHeight: 1.7, marginBottom: 14 }}>
            MVP版では検索欄は見た目だけです。一般ユーザーには開発者だけ表示されます。
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {profiles.map((p) => (
              <UserListCard key={p.id} profile={p} label={profile?.is_admin ? 'USER' : 'DEVELOPER'} />
            ))}
            {profiles.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700 }}>
                表示できるユーザーがまだいません。
              </div>
            )}
          </div>
        </section>
      </main>
      <BottomNav unreadCount={unreadCount} />
    </>
  )
}
