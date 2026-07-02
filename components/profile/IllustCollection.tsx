'use client'

import { useState } from 'react'
import type { IllustrationCard } from '@/lib/illustrationTypes'
import PurchaseModal from '@/components/purchase/PurchaseModal'

type Props = {
  cards: IllustrationCard[]
  userPoints: number
  targetUserId: string
  onPurchaseSuccess?: (illustrationId: string, price: number) => void
}

export default function IllustCollection({
  cards,
  userPoints,
  targetUserId,
  onPurchaseSuccess,
}: Props) {
  const [selectedCard, setSelectedCard] = useState<IllustrationCard | null>(null)

  const handleSuccess = (illustrationId: string, price: number) => {
    setSelectedCard(null)
    onPurchaseSuccess?.(illustrationId, price)
  }

  const ownedCount = cards.filter((c) => c.owned).length

  return (
    <>
      <section className="collection-card">
        <div className="collection-head">
          <div className="collection-title">ILLUST COLLECTION</div>
          <div className="collection-count">{ownedCount}</div>
        </div>
        <div className="collection-grid">
          {cards.map((card) => (
            <IllustPiece
              key={card.id}
              card={card}
              userPoints={userPoints}
              onClick={() => setSelectedCard(card)}
            />
          ))}
        </div>
        <div className="collection-note">
          高額所有 → 通常所有 → 高額未所持 → 通常未所持
        </div>
      </section>

      {selectedCard && (
        <PurchaseModal
          card={selectedCard}
          userPoints={userPoints}
          targetUserId={targetUserId}
          onClose={() => setSelectedCard(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}

// ============================================================
// 個別ピース
// ============================================================
function IllustPiece({
  card,
  userPoints,
  onClick,
}: {
  card: IllustrationCard
  userPoints: number
  onClick: () => void
}) {
  const isLocked = !card.owned
  const cantAfford = isLocked && userPoints < card.price
  const atLimit = card.owned && card.max_per_user !== null && !card.canBuyMore

  return (
    <div
      className={`piece${isLocked ? ' locked' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="art-shine" />

      {isLocked ? (
        <>
          <div className="lock" style={{ opacity: cantAfford ? 0.6 : 1 }}>⌁</div>
          <div className="price">{formatPrice(card.price)}</div>
        </>
      ) : (
        <>
          <div className="qty">×{card.quantity}</div>
          {atLimit && (
            <div style={{
              position: 'absolute',
              top: 3,
              left: 4,
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 7,
              fontWeight: 700,
              color: 'var(--ink-soft)',
            }}>
              MAX
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatPrice(pt: number): string {
  if (pt >= 10000) return '10k'
  if (pt >= 1000) return `${(pt / 1000).toFixed(pt % 1000 === 0 ? 0 : 1)}k`
  return String(pt)
}
