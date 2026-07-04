import type { ReactNode } from 'react'
import type { ProfileData } from '@/lib/staticData'
import type { IllustrationCard } from '@/lib/illustrationTypes'
import type { ActiveDecorations } from '@/lib/decorationTypes'
import type { UserLevel } from '@/lib/level'
import type { ProfileBackground } from '@/lib/backgrounds'
import Avatar from './Avatar'
import BadgeRow from './BadgeRow'
import StatsRow from './StatsRow'
import TopSupporters from './TopSupporters'
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
  showUserPoints = true,
  isPublicView = false,
}: Props) {
  const {
    name,
    rank: _rank, // userLevel.tierName に一本化。静的値は使用しない
    comment,
    photoUrl,
    tags,
    badges,
    stats,
    topSupporters,
    metrics,
  } = profile

  const displayedSupporters = isPublicView
    ? topSupporters.map((s) => ({ ...s, name: '匿名', points: '非公開' }))
    : topSupporters

  return (
    <main className="app">
      {/* ===== Main Card ===== */}
      {/* profile_background スロット: card の直下に absolute で敷く */}
      <div
        className="card profile-bg-card"
        data-level-tier={userLevel?.tier ?? 'base'}
        data-profile-bg={selectedBackground?.css_key ?? 'starter'}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <ProfileBackgroundDecoration decoration={activeDecorations.profile_background} />

        {/* 以下のコンテンツは background の上に乗る（z-index: 1） */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <header className="nav">
            <div className="nav-btn">☰</div>
            <div className="logo">推されーと</div>
            <div className="nav-btn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {logoutButton ?? <span>↗</span>}
              {editLink}
            </div>
          </header>

          <section className="hero">
            {/* avatar_around / avatar_frame は Avatar 内部のスロット */}
            <Avatar
              photoUrl={photoUrl}
              name={name}
              avatarAround={activeDecorations.avatar_around}
              avatarFrame={activeDecorations.avatar_frame}
            />

            {/* above_name スロット */}
            <AboveNameDecoration decoration={activeDecorations.above_name} />

            {/* rank-plain: userLevel がある場合は tierName を表示、なければ非表示 */}
            {userLevel && (
              <div className="rank-plain">{userLevel.tierName}</div>
            )}
            <div className="name">{name}</div>
            {userLevel && <LevelBadge userLevel={userLevel} />}
            <div className="id-meta tag-row">
              {tags.map((tag) => (
                <span key={tag.label} className={`tag-chip ${tag.variant}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </section>

          {/* comment_decoration スロット: profile-comment の背後 */}
          <section className="profile-comment" style={{ position: 'relative' }}>
            <CommentDecoration decoration={activeDecorations.comment_decoration} />
            <div className="comment-mark" style={{ position: 'relative', zIndex: 1 }}>&quot;</div>
            <p style={{ position: 'relative', zIndex: 1 }}>
              {comment.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          </section>

          <StatsRow
            ranking={stats.ranking}
            rankingTotal={stats.rankingTotal}
            charisma={stats.charisma}
          />

          <BadgeRow badges={badges} />

          <div className="rule" />

          <TopSupporters supporters={displayedSupporters} />

          {/* 所持pt: 自分のホームだけ表示。他人から見える公開プロフィールでは非表示。 */}
          {showUserPoints && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '10px 0 0',
              borderTop: '1px solid var(--hair)',
              marginTop: 14,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>
                所持PT
              </div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 800 }}>
                {userPoints.toLocaleString()}
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-soft)', marginLeft: 3 }}>pt</span>
              </div>
            </div>
          )}

          <section className="metrics">
            <div className="metric">
              <div className="metric-label">総サポーター</div>
              <div className="metric-val">{metrics.totalSupporters}</div>
            </div>
            <div className="metric">
              <div className="metric-label">総ギフト額</div>
              <div className="metric-val">{metrics.totalGifts}</div>
            </div>
            <div className="metric">
              <div className="metric-label">24h応援</div>
              <div className="metric-val">{metrics.daily}</div>
            </div>
            <div className="metric">
              <div className="metric-label">イラスト所持</div>
              <div className="metric-val">{metrics.illustOwned}</div>
            </div>
          </section>

          <button className="cta">応援する</button>
        </div>
      </div>

      {/* 30分プレゼント */}
      {giftBox}

      {/* Lv報酬 */}
      {userLevel && <LevelRewards currentLv={userLevel.lv} />}

      {/* イラストコレクション */}
      <IllustCollection
        cards={cards}
        userPoints={userPoints}
        targetUserId={targetUserId}
      />
    </main>
  )
}
