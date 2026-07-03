import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import ProfileEditForm from '@/components/profile/ProfileEditForm'

export default async function ProfileEditPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)

  return (
    <main className="app">
      <div className="card">
        <header className="nav">
          <Link href="/" style={{ fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'none' }}>
            ←
          </Link>
          <div className="logo">プロフィール編集</div>
          <div style={{ width: 20 }} />
        </header>

        <div style={{ marginTop: 20 }}>
          <ProfileEditForm
            initialName={profile?.name ?? ''}
            initialAvatarUrl={profile?.avatar_url ?? ''}
            initialComment={profile?.profile_comment ?? ''}
          />
        </div>
      </div>
    </main>
  )
}
