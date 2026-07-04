import Link from 'next/link'
import { getUserLevel } from '@/lib/level'
import type { FollowProfile } from '@/lib/follows'
import FollowButton from './FollowButton'

type Props = {
  profile: FollowProfile
  label?: string
}

export default function UserListCard({ profile, label }: Props) {
  const level = getUserLevel(profile.charisma ?? 0)
  const name = profile.name || '名無し'

  return (
    <div style={{
      border: '1px solid var(--hair-strong)',
      background: 'rgba(255,255,255,0.76)',
      boxShadow: '0 12px 30px rgba(10,24,28,0.08)',
      padding: 14,
      display: 'grid',
      gridTemplateColumns: '48px 1fr auto',
      gap: 12,
      alignItems: 'center',
    }}>
      <Link href={`/u/${profile.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid var(--hair-strong)',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, rgba(111,255,224,0.28), rgba(255,255,255,0.9))',
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 900,
        }}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{name.slice(0, 1)}</span>
          )}
        </div>
      </Link>

      <Link href={`/u/${profile.id}`} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          {label && (
            <div style={{ fontSize: 8, fontFamily: 'Orbitron, sans-serif', fontWeight: 800, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
              {label}
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile.is_admin ? '開発者：' : ''}{name}
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', fontFamily: 'Orbitron, sans-serif' }}>
            Lv{level.lv} / {level.tierName}
          </div>
          {profile.profile_comment && (
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.profile_comment}
            </div>
          )}
        </div>
      </Link>

      <FollowButton targetUserId={profile.id} initialFollowing={profile.isFollowing} compact />
    </div>
  )
}
