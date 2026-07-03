import type { UserLevel } from '@/lib/level'

type Props = {
  userLevel: UserLevel
}

export default function LevelBadge({ userLevel }: Props) {
  const { lv, tierName, nextRequired, currentRequired, progress, isMax } = userLevel

  const remaining = isMax || nextRequired === null
    ? null
    : nextRequired - currentRequired - Math.floor((nextRequired - currentRequired) * progress)

  return (
    <div style={{
      margin: '14px 0 0',
      padding: '12px 14px',
      border: '1px solid var(--hair-strong)',
      borderRadius: 2,
      background: 'rgba(255,255,255,0.4)',
    }}>
      {/* Lv + ランク名 */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '0.04em',
        }}>
          Lv{lv}
          {isMax && (
            <span style={{
              marginLeft: 6,
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--mint)',
              letterSpacing: '0.2em',
              textShadow: '0 0 6px rgba(111,255,224,0.7)',
            }}>
              MAX
            </span>
          )}
        </div>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--ink-soft)',
          letterSpacing: '0.1em',
        }}>
          {tierName}
        </div>
      </div>

      {/* 進捗バー */}
      <div style={{
        height: 3,
        background: 'var(--hair)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: isMax ? 0 : 6,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.round(progress * 100)}%`,
          background: isMax
            ? 'var(--mint)'
            : 'linear-gradient(90deg, rgba(111,255,224,0.5), var(--mint))',
          borderRadius: 2,
          transition: 'width 0.4s ease',
          boxShadow: '0 0 4px rgba(111,255,224,0.5)',
        }} />
      </div>

      {/* 次Lvまでのテキスト */}
      {!isMax && remaining !== null && (
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--ink-faint)',
          letterSpacing: '0.06em',
          textAlign: 'right',
        }}>
          次のLvまで あと {remaining.toLocaleString()} charisma
        </div>
      )}
    </div>
  )
}
