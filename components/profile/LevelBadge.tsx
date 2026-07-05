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
    <div className="level-badge-card">
      {/* Lv + ランク名 */}
      <div className="level-badge-head">
        <div className="level-badge-lv">
          Lv{lv}
          {isMax && <span className="level-badge-max">MAX</span>}
        </div>
        <div className="level-badge-tier">{tierName}</div>
      </div>

      {/* 進捗バー */}
      <div className="level-progress-track">
        <div
          className="level-progress-fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* 次Lvまでのテキスト */}
      {!isMax && remaining !== null && (
        <div className="level-badge-next">
          次のLvまで あと {remaining.toLocaleString()} charisma
        </div>
      )}
    </div>
  )
}
