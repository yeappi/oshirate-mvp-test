import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { DEFAULT_BACKGROUND_ID, getProfileBackgrounds } from '@/lib/backgrounds'
import { getUserUnlockedBackgroundIds } from '@/lib/items'
import BackgroundSelectForm from '@/components/profile/background/BackgroundSelectForm'

export default async function ProfileBackgroundPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, backgrounds, itemUnlockedIds] = await Promise.all([
    getProfile(user.id),
    getProfileBackgrounds(),
    getUserUnlockedBackgroundIds(user.id),
  ])

  const selectedBackgroundId = profile?.selected_background_id ?? DEFAULT_BACKGROUND_ID
  const totalSpentPoints = Number(profile?.total_spent_points ?? 0)

  return (
    <main className="app">
      <div className="card">
        <header className="nav">
          <Link href="/profile/edit" style={{ fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'none' }}>
            ←
          </Link>
          <div className="logo">背景選択</div>
          <div style={{ width: 20 }} />
        </header>

        <div style={{ marginTop: 20 }}>
          <div style={{
            marginBottom: 14,
            padding: '10px 0',
            borderTop: '1px solid var(--hair)',
            borderBottom: '1px solid var(--hair)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>
累計使用PT
            </span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 800 }}>
{totalSpentPoints.toLocaleString()}pt
            </span>
          </div>

          <BackgroundSelectForm
            backgrounds={backgrounds}
            selectedBackgroundId={selectedBackgroundId}
            totalSpentPoints={totalSpentPoints}
            itemUnlockedIds={Array.from(itemUnlockedIds)}
          />
        </div>
      </div>
    </main>
  )
}
