import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { getUserLevel } from '@/lib/level'
import AvatarDecorationSelectForm from '@/components/profile/decorations/AvatarDecorationSelectForm'

export default async function AvatarDecorationsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/')

  const userLevel = getUserLevel(profile.charisma ?? 0)

  return (
    <main className="profile-edit-page">
      <div className="edit-card avatar-decoration-card">
        <header className="profile-decoration-header">
          <Link href="/profile/edit" className="back-link">← 戻る</Link>
          <div>
            <p className="profile-decoration-kicker">PROFILE CUSTOM</p>
            <h1>アイコン装飾</h1>
            <p>
              Lvで解放された羽・王冠・前景エフェクトを、好きな組み合わせでプロフィールに装備できます。
            </p>
          </div>
          <div className="profile-decoration-lv">Lv{userLevel.lv}</div>
        </header>

        <AvatarDecorationSelectForm
          lv={userLevel.lv}
          avatarEffectKey={userLevel.avatarEffectKey}
          photoUrl={profile.avatar_url}
          name={profile.name ?? '？'}
          initialWing={profile.selected_wing_asset}
          initialCrown={profile.selected_crown_asset}
          initialFrontFx={profile.selected_front_fx_asset}
        />
      </div>
    </main>
  )
}
