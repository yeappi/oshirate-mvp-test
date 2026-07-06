import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/auth'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import LogoutButton from '@/components/auth/LogoutButton'
import { GuideButton } from '@/components/guide/GuideModal'

export default async function ProfileEditPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)

  return (
    <main className="app">
      <div className="card">
        <header className="nav profile-edit-page-nav">
          <GuideButton kind="profile" className="in-nav" />
          <div className="logo">プロフィール編集</div>
          <LogoutButton label="LOGOUT" />
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
