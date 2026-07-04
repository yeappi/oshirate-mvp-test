import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { DEFAULT_AVATAR_FRAME_ID, getAvatarFrames } from '@/lib/avatarFrames'
import FrameSelectForm from '@/components/profile/frame/FrameSelectForm'

export default async function ProfileFramePage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [profile, frames] = await Promise.all([
    getProfile(user.id),
    getAvatarFrames(),
  ])

  const selectedFrameId = profile?.selected_avatar_frame_id ?? DEFAULT_AVATAR_FRAME_ID
  const totalSpentPoints = Number(profile?.total_spent_points ?? 0)

  return (
    <main className="app">
      <div className="card">
        <header className="nav">
          <Link href="/profile/edit" style={{ fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'none' }}>
            ←
          </Link>
          <div className="logo">フレーム選択</div>
          <div style={{ width: 20 }} />
        </header>

        <div style={{ marginTop: 20 }}>
          <FrameSelectForm
            frames={frames}
            selectedFrameId={selectedFrameId}
            totalSpentPoints={totalSpentPoints}
          />
        </div>
      </div>
    </main>
  )
}
