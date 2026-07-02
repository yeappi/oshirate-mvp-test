import type { ReactNode } from 'react'
import type { ProfileData } from '@/lib/staticData'
import type { IllustrationCard } from '@/lib/illustrationTypes'
import type { ActiveDecorations } from '@/lib/decorationTypes'
import Avatar from './Avatar'
import BadgeRow from './BadgeRow'
import StatsRow from './StatsRow'
import TopSupporters from './TopSupporters'
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
  activeDecorations?: ActiveDecorations
  logoutButton?: ReactNode
  giftBox?: ReactNode
}

export default function ProfileCard({
  profile,
  cards,
  userPoints,
  targetUserId,
  activeDecorations = {},
  logoutButton,
  giftBox,
}: Props) {
  const {
    name,
    rank,
    comment,
    photoUrl,
    tags,
    badges,
    stats,
    favorites,
    topSupporters,
    metrics,
  } = profile

  return (
    <main className="app">
      {/* ===== Main Card ===== */}
      {/* profile_background スロット: card の直下に absolute で敷く */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <ProfileBackgroundDecoration decoration={activeDecorations.profile_background} />

        {/* 以下のコンテンツは background の上に乗る（z-index: 1） */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <header className="nav">
            <div className="nav-btn">☰</div>
            <div className="logo">推されーと</div>
            <div className="nav-btn">{logoutButton ?? <span>↗</span>}</div>
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

            <div className="rank-plain">{rank}</div>
            <div className="name">{name}</div>
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

          <section>
            <div className="favorite-title">お気に入りの記念</div>
            <div className="fav-grid">
              {favorites.map((fav, i) => (
                <div key={i} className="fav">
                  <div className="art-shine" />
                  <div className="fav-num">
                    <small>×</small>
                    {fav.count}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="rule" />

          <TopSupporters supporters={topSupporters} />

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

      {/* イラストコレクション */}
      <IllustCollection
        cards={cards}
        userPoints={userPoints}
        targetUserId={targetUserId}
      />
    </main>
  )
}
