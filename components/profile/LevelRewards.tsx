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
      className={`reward-row reward-row-slim${achieved ? ' achieved' : ' locked'} reward-kind-${reward.kind}`}
      data-reward-lv={reward.lv}
      data-reward-kind={reward.kind}
    >
      <div className="reward-lock-mark" aria-hidden="true">
        {achieved ? '✓' : '🔒'}
      </div>

      <div className="reward-main">
        <div className="reward-meta-line">
          <span className="reward-lv">Lv{reward.lv}</span>
          <span className="reward-kind-chip">{kindLabel(reward.kind)}</span>
          {achieved && <span className="reward-opened">解放済</span>}
        </div>
        <div className="reward-detail">{reward.detail}</div>
      </div>

      <span className="reward-motion" aria-hidden="true" />
    </div>
  )
}

export default function LevelRewards({ currentLv }: Props) {
  const nextReward = LEVEL_REWARDS
    .filter((reward) => reward.lv > currentLv)
    .sort((a, b) => a.lv - b.lv)[0]

  const latestAchieved = [...LEVEL_REWARDS]
    .filter((reward) => reward.lv <= currentLv)
    .sort((a, b) => b.lv - a.lv)[0]

  const featured = nextReward ? [nextReward] : latestAchieved ? [latestAchieved] : []
  const featuredKeys = new Set(featured.map((reward) => `${reward.lv}-${reward.kind}-${reward.rewardId}`))
  const hidden = LEVEL_REWARDS.filter(
    (reward) => !featuredKeys.has(`${reward.lv}-${reward.kind}-${reward.rewardId}`)
  )

  return (
    <section className="level-reward-section">
      <div className="collection-card level-reward-card">
        <div className="level-reward-head">
          <div className="level-reward-title">LV REWARDS</div>
          <div className="level-reward-sub">次の解放</div>
        </div>

        <div className="reward-list-slim">
          {featured.map((reward) => (
            <RewardRow key={`${reward.lv}-${reward.kind}-${reward.rewardId}`} reward={reward} currentLv={currentLv} />
          ))}
        </div>

        {hidden.length > 0 && (
          <details className="more-rewards more-rewards-slim">
            <summary>もっと見る</summary>
            <div className="reward-list-slim reward-list-hidden">
              {hidden.map((reward) => (
                <RewardRow key={`${reward.lv}-${reward.kind}-${reward.rewardId}`} reward={reward} currentLv={currentLv} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  )
}
