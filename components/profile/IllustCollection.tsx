'use client'

import { useMemo, useState } from 'react'
import type { IllustrationCard } from '@/lib/illustrationTypes'
import PurchaseModal from '@/components/purchase/PurchaseModal'

type Props = {
  cards: IllustrationCard[]
  userPoints: number
  targetUserId: string
  onPurchaseSuccess?: (illustrationId: string, price: number) => void
}

const FAVORITE_LIMIT = 3

export default function IllustCollection({
  cards,
  userPoints,
  targetUserId,
  onPurchaseSuccess,
}: Props) {
  const [items, setItems] = useState(cards)
  const [selectedCard, setSelectedCard] = useState<IllustrationCard | null>(null)
  const [favoriteStatus, setFavoriteStatus] = useState<string | null>(null)

  const sortedItems = useMemo(() => sortIllustrationCards(items), [items])
  const favorites = useMemo(
    () => sortedItems
      .filter((card) => card.owned && card.isFavorite)
      .sort((a, b) => {
        const ao = a.favoriteOrder ?? 999
        const bo = b.favoriteOrder ?? 999
        if (ao !== bo) return ao - bo
        if (a.price !== b.price) return b.price - a.price
        return a.sort_order - b.sort_order
      })
      .slice(0, FAVORITE_LIMIT),
    [sortedItems]
  )

  const handleSuccess = (illustrationId: string, price: number) => {
    setSelectedCard(null)
    onPurchaseSuccess?.(illustrationId, price)
  }

  const toggleFavorite = async (card: IllustrationCard) => {
    if (!card.owned) return
    setFavoriteStatus(null)

    try {
      const res = await fetch('/api/profile/favorite-illustrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ illustrationId: card.id }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        if (json.error === 'favorite_limit_reached') {
          setFavoriteStatus('お気に入りは最大3つまでです')
        } else if (json.error === 'not_owned') {
          setFavoriteStatus('購入済みイラストだけお気に入りにできます')
        } else {
          setFavoriteStatus('お気に入り更新に失敗しました')
        }
        return
      }

      setItems((current) => {
        const next = current.map((item) => {
          if (item.id !== card.id) return item
          return {
            ...item,
            isFavorite: Boolean(json.isFavorite),
            favoriteOrder: json.isFavorite ? nextFavoriteOrder(current) : null,
          } as IllustrationCard
        })
        return normalizeFavoriteOrders(next)
      })
      setFavoriteStatus(json.isFavorite ? 'お気に入りに追加しました' : 'お気に入りを外しました')
    } catch {
      setFavoriteStatus('お気に入り更新に失敗しました')
    }
  }

  const ownedCount = sortedItems.filter((c) => c.owned).length

  return (
    <>
      <section className="collection-card" style={{ marginBottom: 12 }}>
        <div className="collection-head">
          <div className="collection-title">FAVORITE ILLUST</div>
          <div className="collection-count">{favorites.length}/{FAVORITE_LIMIT}</div>
        </div>
        {favorites.length > 0 ? (
          <div className="favorite-illust-grid">
            {favorites.map((card) => (
              <button
                type="button"
                key={card.id}
                className="favorite-illust-card"
                onClick={() => setSelectedCard(card)}
              >
                {card.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.title} />
                ) : (
                  <span>✦</span>
                )}
                <div className="favorite-illust-label">{card.title}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, lineHeight: 1.8 }}>
            購入済みイラストの ☆ を押すと、ここに最大3つまで表示できます。
          </div>
        )}
      </section>

      <section className="collection-card">
        <div className="collection-head">
          <div className="collection-title">ILLUST COLLECTION</div>
          <div className="collection-count">{ownedCount}</div>
        </div>
        <div className="collection-grid">
          {sortedItems.map((card) => (
            <IllustPiece
              key={card.id}
              card={card}
              userPoints={userPoints}
              onClick={() => setSelectedCard(card)}
              onFavoriteToggle={() => toggleFavorite(card)}
            />
          ))}
        </div>
        {favoriteStatus && (
          <div style={{ marginTop: 9, fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)' }}>
            {favoriteStatus}
          </div>
        )}
        <div className="collection-note">
          所有済み → 高額順 → 同価格内は管理順 / 未所有も同じルール
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
  onFavoriteToggle,
}: {
  card: IllustrationCard
  userPoints: number
  onClick: () => void
  onFavoriteToggle: () => void
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
      {card.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.image_url}
          alt={card.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLocked ? 0.42 : 1,
            filter: isLocked ? 'grayscale(0.9) contrast(0.82)' : 'none',
            transform: isLocked ? 'scale(1.04)' : 'scale(1)',
          }}
        />
      )}
      <div className="art-shine" />

      {card.owned && (
        <button
          type="button"
          aria-label={card.isFavorite ? 'お気に入りを外す' : 'お気に入りに追加'}
          onClick={(event) => {
            event.stopPropagation()
            onFavoriteToggle()
          }}
          className={`favorite-toggle${card.isFavorite ? ' active' : ''}`}
        >
          ★
        </button>
      )}

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

function sortIllustrationCards(cards: IllustrationCard[]): IllustrationCard[] {
  return [...cards].sort((a, b) => {
    if (a.owned !== b.owned) return a.owned ? -1 : 1
    if (a.price !== b.price) return b.price - a.price
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.title.localeCompare(b.title, 'ja')
  })
}

function nextFavoriteOrder(cards: IllustrationCard[]): number {
  const orders = cards
    .filter((card) => card.owned && card.isFavorite && typeof card.favoriteOrder === 'number')
    .map((card) => card.favoriteOrder ?? 0)
  return orders.length === 0 ? 1 : Math.max(...orders) + 1
}

function normalizeFavoriteOrders(cards: IllustrationCard[]): IllustrationCard[] {
  const favoriteIds = cards
    .filter((card) => card.owned && card.isFavorite)
    .sort((a, b) => {
      const ao = a.favoriteOrder ?? 999
      const bo = b.favoriteOrder ?? 999
      if (ao !== bo) return ao - bo
      if (a.price !== b.price) return b.price - a.price
      return a.sort_order - b.sort_order
    })
    .slice(0, FAVORITE_LIMIT)
    .map((card) => card.id)

  return cards.map((card) => {
    const idx = favoriteIds.indexOf(card.id)
    return {
      ...card,
      isFavorite: idx >= 0,
      favoriteOrder: idx >= 0 ? idx + 1 : null,
    } as IllustrationCard
  })
}

function formatPrice(pt: number): string {
  if (pt >= 10000) return '10k'
  if (pt >= 1000) return `${(pt / 1000).toFixed(pt % 1000 === 0 ? 0 : 1)}k`
  return String(pt)
}
