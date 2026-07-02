import type { Badge } from '@/lib/staticData'

type Props = {
  badges: Badge[]
}

export default function BadgeRow({ badges }: Props) {
  return (
    <section className="badges">
      {badges.map((badge) => (
        <div key={badge.name}>
          <div className={`badge-mark${badge.isLead ? ' lead' : ''}`}>
            <span className="rim" />
            <span className="core" />
            <span className="pip" />
          </div>
          <div className="badge-name">{badge.name}</div>
        </div>
      ))}
    </section>
  )
}
