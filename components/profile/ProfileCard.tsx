import type { ReactNode } from 'react'
import type { ProfileData } from '@/lib/staticData'
import type { IllustrationCard } from '@/lib/illustrationTypes'
import type { ActiveDecorations } from '@/lib/decorationTypes'
import type { UserLevel } from '@/lib/level'
import type { ProfileBackground } from '@/lib/backgrounds'
import type { AvatarFrame } from '@/lib/avatarFrames'
import Avatar from './Avatar'
import StatsRow from './StatsRow'
import LevelBadge from './LevelBadge'
import LevelRewards from './LevelRewards'
import IllustCollection from './IllustCollection'
import {
  ProfileBackgroundDecoration,
  AboveNameDecoration,
  CommentDecoration,
} from '@/components/decoration/DecorationSlotRenderer'

type Props = {
  profile: ProfileData
  cards: IllustrationCard[]
  userPoints: number
  targetUserId: string
  showUserPoints?: boolean
  isPublicView?: boolean
  activeDecorations?: ActiveDecorations
  logoutButton?: ReactNode
  giftBox?: ReactNode
  editLink?: ReactNode
  userLevel?: UserLevel
  selectedBackground?: ProfileBackground | null
  selectedAvatarFrame?: AvatarFrame | null
}

export default function ProfileCard({
  profile,
  cards,
  userPoints,
  targetUserId,
  activeDecorations = {},
  logoutButton,
  giftBox,
  editLink,
  userLevel,
  selectedBackground,
  selectedAvatarFrame,
  showUserPoints = true,
  isPublicView = false,
}: Props) {
  const {
    name,
    comment,
    photoUrl,
    tags,
    stats,
  } = profile

  return (
    <main className="app">
      {/* ===== Main Card ===== */}
      <div
        className="card profile-bg-card"
        data-level-tier={userLevel?.tier ?? 'base'}
        data-profile-bg={selectedBackground?.css_key ?? 'starter'}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <ProfileBackgroundDecoration decoration={activeDecorations.profile_background} />

        <div className="profile-inner-plate" style={{ position: 'relative', zIndex: 1 }}>
          <header className="nav profile-nav-clean">
            <div className="logo">推されーと</div>
            {editLink && (
              <div className="nav-actions profile-edit-action">
                {editLink}
              </div>
            )}
          </header>

          <section className="hero">
            <Avatar
              photoUrl={photoUrl}
              name={name}
              avatarAround={activeDecorations.avatar_around}
              avatarFrame={activeDecorations.avatar_frame}
              cssFrameKey={selectedAvatarFrame?.css_key ?? 'black'}
            />

            <AboveNameDecoration decoration={activeDecorations.above_name} />

            <div className="name">{name}</div>
            <div className="id-meta tag-row">
              {tags.map((tag) => (
                <span key={tag.label} className={`tag-chip ${tag.variant}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </section>

          <section className={`profile-comment${comment.trim() ? '' : ' empty'}`} style={{ position: 'relative' }}>
            <CommentDecoration decoration={activeDecorations.comment_decoration} />
            <div className="comment-mark" style={{ position: 'relative', zIndex: 1 }}>「</div>
            <p style={{ position: 'relative', zIndex: 1 }}>
              {comment.trim() ? (
                comment.split('\n').map((line, i, arr) => (
                  <span key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </span>
                ))
              ) : (
                editLink ? '一言を書く +' : 'まだ一言はありません'
              )}
            </p>
          </section>

          <StatsRow
            ranking={stats.ranking}
            rankingTotal={stats.rankingTotal}
            charisma={stats.charisma}
          />

          <IllustCollection
            cards={cards}
            userPoints={userPoints}
            targetUserId={targetUserId}
            canEditFavorites={!isPublicView}
            showCollection={false}
          />

          {showUserPoints && (
            <div className="points-strip">
              <div className="points-label">所持PT</div>
              <div className="points-value">
                {userPoints.toLocaleString()}
                <span>pt</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 30分プレゼント */}
      {giftBox}

      {/* Lv表示 */}
      {userLevel && <LevelBadge userLevel={userLevel} />}

      {/* Lv報酬 */}
      {userLevel && <LevelRewards currentLv={userLevel.lv} />}

      {/* イラストコレクション */}
      <IllustCollection
        cards={cards}
        userPoints={userPoints}
        targetUserId={targetUserId}
        canEditFavorites={!isPublicView}
        showFavorites={false}
      />
    </main>
  )
}
