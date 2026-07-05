import { LEVEL_REWARDS } from '@/lib/level'

type Props = {
  currentLv: number
}

function kindLabel(kind: 'background' | 'tag'): string {
  return kind === 'background' ? '背景' : 'タグ'
}

function RewardRow({ reward, currentLv }: { reward: (typeof LEVEL_REWARDS)[number]; currentLv: number }) {
  const achieved = currentLv >= reward.lv
  return (
    <div
      className={`reward-row${achieved ? ' achieved' : ' locked'} reward-kind-${reward.kind}`}
      data-reward-lv={reward.lv}
      data-reward-kind={reward.kind}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 999,
        border: `1px solid ${achieved ? 'var(--mint)' : 'var(--hair-strong)'}`,
        background: achieved ? 'rgba(61,219,184,0.1)' : 'rgba(17,17,17,0.025)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize: 10,
        color: achieved ? 'var(--mint)' : 'var(--ink-mid)',
      }}>
        {achieved ? '✓' : 'LOCK'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 8,
            fontWeight: 700,
            color: achieved ? 'var(--ink)' : 'var(--ink-mid)',
            letterSpacing: '0.1em',
          }}>
            Lv{reward.lv}
          </span>
          <span style={{
            fontSize: 8,
            fontWeight: 800,
            color: achieved ? 'var(--ink-mid)' : 'var(--ink-mid)',
            border: `1px solid ${achieved ? 'var(--hair-strong)' : 'var(--hair)'}`,
            background: achieved ? 'rgba(17,17,17,0.045)' : 'rgba(17,17,17,0.025)',
            padding: '1px 7px',
            borderRadius: 999,
            letterSpacing: '0.04em',
          }}>
            {kindLabel(reward.kind)}
          </span>
        </div>
        <div style={{
          marginTop: 3,
          fontSize: 11,
          fontWeight: 700,
          color: achieved ? 'var(--ink-mid)' : 'var(--ink-mid)',
          letterSpacing: '0.02em',
        }}>
          {reward.detail}
        </div>
      </div>

      <span className="reward-motion" aria-hidden="true" />

      {achieved && (
        <div style={{
          fontSize: 7,
          fontWeight: 700,
          fontFamily: 'Orbitron, sans-serif',
          color: 'var(--ink-soft)',
          letterSpacing: '0.08em',
          border: '1px solid var(--hair-strong)',
          background: 'rgba(255,255,255,0.45)',
          padding: '2px 6px',
          borderRadius: 999,
        }}>
          解放済
        </div>
      )}
    </div>
  )
}

export default function LevelRewards({ currentLv }: Props) {
  const previous = [...LEVEL_REWARDS]
    .filter((reward) => reward.lv <= currentLv)
    .sort((a, b) => b.lv - a.lv)
    .slice(0, 2)

  const next = LEVEL_REWARDS
    .filter((reward) => reward.lv > currentLv)
    .sort((a, b) => a.lv - b.lv)
    .slice(0, 2)

  const featured = [...previous.reverse(), ...next]
  const featuredKeys = new Set(featured.map((reward) => `${reward.lv}-${reward.kind}-${reward.rewardId}`))
  const hidden = LEVEL_REWARDS.filter(
    (reward) => !featuredKeys.has(`${reward.lv}-${reward.kind}-${reward.rewardId}`)
  )

  return (
    <section style={{ marginTop: 14 }}>
      <div className="collection-card" style={{ padding: '14px 16px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 12,
        }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'var(--ink-soft)',
          }}>
            LV REWARDS
          </div>
          <div style={{
            fontSize: 8,
            fontWeight: 700,
            color: 'var(--ink-faint)',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}>
            背景 / タグ
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {featured.map((reward) => (
            <RewardRow key={`${reward.lv}-${reward.kind}-${reward.rewardId}`} reward={reward} currentLv={currentLv} />
          ))}
        </div>

        {hidden.length > 0 && (
          <details className="more-rewards">
            <summary>もっと見る</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {hidden.map((reward) => (
                <RewardRow key={`${reward.lv}-${reward.kind}-${reward.rewardId}`} reward={reward} currentLv={currentLv} />
              ))}
            </div>
          </details>
        )}

        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--hair)',
          fontSize: 9,
          lineHeight: 1.6,
          color: 'var(--ink-faint)',
          letterSpacing: '0.04em',
        }}>
          アイコンフレームは「累計使用pt」で解放されます。Lv報酬とは別枠です。
        </div>
      </div>
    </section>
  )
}
