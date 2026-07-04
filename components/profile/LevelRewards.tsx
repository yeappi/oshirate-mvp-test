import { LEVEL_REWARDS } from '@/lib/level'

type Props = {
  currentLv: number
}

function kindLabel(kind: 'background' | 'tag'): string {
  return kind === 'background' ? '背景' : 'タグ'
}

export default function LevelRewards({ currentLv }: Props) {
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
          {LEVEL_REWARDS.map((reward) => {
            const achieved = currentLv >= reward.lv
            return (
              <div
                key={`${reward.lv}-${reward.kind}-${reward.rewardId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: achieved ? 1 : 0.45,
                }}
              >
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

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: 8,
                      fontWeight: 700,
                      color: achieved ? 'var(--ink)' : 'var(--ink-faint)',
                      letterSpacing: '0.1em',
                    }}>
                      Lv{reward.lv}
                    </span>
                    <span style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: achieved ? '#007a5e' : 'var(--ink-faint)',
                      border: `1px solid ${achieved ? 'rgba(111,255,224,0.45)' : 'var(--hair)'}`,
                      background: achieved ? 'rgba(111,255,224,0.08)' : 'transparent',
                      padding: '1px 5px',
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
                    color: achieved ? 'var(--ink-soft)' : 'var(--ink-faint)',
                    letterSpacing: '0.02em',
                  }}>
                    {reward.detail}
                  </div>
                </div>

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
