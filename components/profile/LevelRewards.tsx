import { LEVEL_REWARDS } from '@/lib/level'

type Props = {
  currentLv: number
}

export default function LevelRewards({ currentLv }: Props) {
  return (
    <section style={{ marginTop: 14 }}>
      <div className="collection-card" style={{ padding: '14px 16px 16px' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.2em',
          color: 'var(--ink-soft)',
          marginBottom: 12,
        }}>
          LV REWARDS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LEVEL_REWARDS.map((reward) => {
            const achieved = currentLv >= reward.lv
            return (
              <div
                key={reward.lv}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: achieved ? 1 : 0.45,
                }}
              >
                {/* チェックマーク / ロック */}
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 1,
                  border: `1px solid ${achieved ? 'var(--mint)' : 'var(--hair-strong)'}`,
                  background: achieved ? 'rgba(111,255,224,0.1)' : 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  fontSize: 10,
                  color: achieved ? 'var(--mint)' : 'var(--ink-faint)',
                  boxShadow: achieved ? '0 0 5px rgba(111,255,224,0.3)' : 'none',
                }}>
                  {achieved ? '✓' : '⌁'}
                </div>

                {/* Lv + ラベル */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: 8,
                    fontWeight: 700,
                    color: achieved ? 'var(--ink)' : 'var(--ink-faint)',
                    letterSpacing: '0.1em',
                    marginRight: 8,
                  }}>
                    Lv{reward.lv}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: achieved ? 'var(--ink-soft)' : 'var(--ink-faint)',
                    letterSpacing: '0.02em',
                  }}>
                    {reward.label}
                  </span>
                </div>

                {/* 達成バッジ */}
                {achieved && (
                  <div style={{
                    fontSize: 7,
                    fontWeight: 700,
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#007a5e',
                    letterSpacing: '0.08em',
                    border: '1px solid rgba(111,255,224,0.5)',
                    background: 'rgba(111,255,224,0.08)',
                    padding: '2px 5px',
                    borderRadius: 1,
                  }}>
                    解放済
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
