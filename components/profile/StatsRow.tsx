type Props = {
  ranking: number
  rankingTotal: string
  charisma: string
}

export default function StatsRow({ ranking, rankingTotal, charisma }: Props) {
  return (
    <section className="stats">
      <div className="stat">
        <div className="stat-title">全体ランキング</div>
        <div className="stat-main">
          {ranking}
          <small>位</small>
        </div>
        <div className="stat-sub">/{rankingTotal}人中</div>
      </div>
      <div className="stat stat-charm">
        <div className="stat-title">魅力値</div>
        <div className="stat-main">{charisma}</div>
        <div className="stat-sub faint">CHARISMA</div>
      </div>
    </section>
  )
}
