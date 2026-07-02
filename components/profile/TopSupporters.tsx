import type { Supporter } from '@/lib/staticData'

type Props = {
  supporters: Supporter[]
}

export default function TopSupporters({ supporters }: Props) {
  return (
    <section>
      <div className="section-title">TOP SUPPORTER</div>
      <div className="podium">
        {supporters.map((s) => (
          <div key={s.rank} className={`pod${s.isFirst ? ' first' : ''}`}>
            <div className="pod-rank">{s.rank}</div>
            {/* Phase 1以降: アイコン画像に差し替え */}
            <div className="pod-avatar" />
            {/* MVP実験ルール: 一般ユーザー間は非公開 → Phase 1でロール判定 */}
            <div className="pod-name">{s.name}</div>
            <div className="pod-pt">{s.points}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
