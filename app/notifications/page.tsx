import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { getNotifications } from '@/lib/notifications'
import NotificationList from '@/components/notifications/NotificationList'
import BottomNav from '@/components/layout/BottomNav'

export default async function NotificationsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const notifications = await getNotifications(user.id)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <div style={{ paddingBottom: 64 }}>
        <main className="app">
          <div className="card">
            <header className="nav">
              <Link href="/" style={{ fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'none' }}>
                ←
              </Link>
              <div className="logo">NOTIFICATIONS</div>
              <div style={{ width: 20 }} />
            </header>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: 20,
              marginBottom: 4,
              paddingBottom: 12,
              borderBottom: '1px solid var(--hair)',
            }}>
              <div style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
              }}>
                通知
              </div>
              {unreadCount > 0 && (
                <div style={{
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: 9, fontWeight: 700,
                  color: 'var(--mint)', letterSpacing: '0.1em',
                }}>
                  未読 {unreadCount}
                </div>
              )}
            </div>

            <NotificationList notifications={notifications} />
          </div>
        </main>
      </div>
      <BottomNav unreadCount={unreadCount} />
    </>
  )
}
