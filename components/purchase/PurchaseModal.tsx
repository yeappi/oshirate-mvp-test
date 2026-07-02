'use client'

import { useState } from 'react'
import type { IllustrationCard } from '@/lib/illustrationTypes'
import type { Decoration } from '@/lib/decorationTypes'

type Props = {
  card: IllustrationCard
  userPoints: number
  targetUserId: string
  onClose: () => void
  onSuccess: (illustrationId: string, price: number) => void
}

type RankUp = { from: number; to: number }

type PurchasePhase =
  | 'confirm'
  | 'loading'
  | 'success'
  | 'rankup'          // ランクアップ演出
  | 'error'

type ErrorType =
  | 'insufficient_points'
  | 'purchase_limit_reached'
  | 'illustration_not_found'
  | 'unknown'

const ERROR_MSG: Record<ErrorType, string> = {
  insufficient_points:    'ポイントが足りません',
  purchase_limit_reached: 'これ以上購入できません',
  illustration_not_found: 'イラストが見つかりませんでした',
  unknown:                'エラーが発生しました。もう一度お試しください',
}

export default function PurchaseModal({
  card,
  userPoints,
  targetUserId,
  onClose,
  onSuccess,
}: Props) {
  const [phase, setPhase] = useState<PurchasePhase>('confirm')
  const [errorType, setErrorType] = useState<ErrorType | null>(null)
  const [rankUp, setRankUp] = useState<RankUp | null>(null)
  const [unlockedDecorations, setUnlockedDecorations] = useState<Decoration[]>([])

  const canAfford = userPoints >= card.price
  const alreadyAtLimit = card.owned && card.max_per_user !== null && !card.canBuyMore

  const handlePurchase = async () => {
    if (!canAfford || alreadyAtLimit) return
    setPhase('loading')

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ illustrationId: card.id, targetUserId }),
      })
      const json = await res.json()

      if (!res.ok || !json.ok) {
        setErrorType((json.error as ErrorType) ?? 'unknown')
        setPhase('error')
        return
      }

      onSuccess(card.id, card.price)

      // ランクアップがあれば rankup フェーズへ
      if (json.rankUp) {
        setRankUp(json.rankUp)
        setUnlockedDecorations(json.unlockedDecorations ?? [])
        setPhase('rankup')
      } else {
        setPhase('success')
      }
    } catch {
      setErrorType('unknown')
      setPhase('error')
    }
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        onClick={phase === 'confirm' ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,17,14,0.55)',
          zIndex: 100,
        }}
      />

      {/* モーダル本体 */}
      <div style={{
        position: 'fixed',
        left: '50%',
        bottom: 0,
        transform: 'translateX(-50%)',
        width: 'min(100%, 420px)',
        background: 'var(--paper)',
        borderTop: '1px solid var(--hair-strong)',
        borderRadius: '2px 2px 0 0',
        padding: '24px 24px 40px',
        zIndex: 101,
      }}>
        {/* ハンドル */}
        <div style={{
          width: 32, height: 2,
          background: 'var(--hair-strong)',
          margin: '0 auto 20px',
        }} />

        {(phase === 'confirm' || phase === 'loading') && (
          <ConfirmView
            card={card}
            userPoints={userPoints}
            canAfford={canAfford}
            alreadyAtLimit={alreadyAtLimit}
            loading={phase === 'loading'}
            onPurchase={handlePurchase}
            onClose={onClose}
          />
        )}
        {phase === 'success' && (
          <SuccessView card={card} onClose={onClose} />
        )}
        {phase === 'rankup' && rankUp && (
          <RankUpView
            card={card}
            rankUp={rankUp}
            unlockedDecorations={unlockedDecorations}
            onClose={onClose}
          />
        )}
        {phase === 'error' && (
          <ErrorView
            errorType={errorType!}
            onRetry={() => setPhase('confirm')}
            onClose={onClose}
          />
        )}
      </div>
    </>
  )
}

// ============================================================
// 確認画面
// ============================================================
function ConfirmView({
  card,
  userPoints,
  canAfford,
  alreadyAtLimit,
  loading,
  onPurchase,
  onClose,
}: {
  card: IllustrationCard
  userPoints: number
  canAfford: boolean
  alreadyAtLimit: boolean
  loading: boolean
  onPurchase: () => void
  onClose: () => void
}) {
  const blocked = !canAfford || alreadyAtLimit
  const isLimited = card.max_per_user !== null

  return (
    <>
      {/* イラストプレビュー枠 */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        border: '1px solid var(--hair-strong)',
        background: 'linear-gradient(155deg, rgba(255,255,255,0.5), rgba(111,255,224,0.08))',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CornerMark pos="top" />
        <CornerMark pos="bottom" />

        {card.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={card.image_url} alt={card.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: 32, color: 'var(--ink-faint)',
            }}>✦</span>
        }

        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          fontSize: 8, fontWeight: 700,
          fontFamily: 'Orbitron, sans-serif',
          color: 'var(--ink-soft)', letterSpacing: '0.06em',
        }}>
          TOP {card.topBuyerLabel}
        </div>
      </div>

      {/* タイトル */}
      <div style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: 13,
        fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6,
      }}>
        {card.title}
      </div>

      {/* 限定バッジ */}
      {isLimited && (
        <div style={{
          display: 'inline-block', fontSize: 8, fontWeight: 700,
          color: '#b40a0a', border: '1px solid rgba(180,10,10,0.28)',
          background: 'rgba(180,10,10,0.07)', padding: '2px 6px',
          borderRadius: 1, letterSpacing: '0.06em', marginBottom: 14,
        }}>
          LIMITED {card.max_per_user !== null ? `× ${card.max_per_user}` : ''}
        </div>
      )}

      {/* 価格行 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderTop: '1px solid var(--hair)', paddingTop: 14,
        marginTop: isLimited ? 0 : 14, marginBottom: 6,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.08em' }}>
          価格
        </span>
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 800 }}>
          {card.price.toLocaleString()}
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', marginLeft: 2 }}>pt</span>
        </span>
      </div>

      {/* 所持pt */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
          color: canAfford ? 'var(--ink-faint)' : '#b40a0a',
        }}>
          所持 {userPoints.toLocaleString()}pt{!canAfford && '（不足）'}
        </span>
      </div>

      <ModalButton
        onClick={onPurchase}
        disabled={blocked || loading}
        variant={blocked ? 'disabled' : 'primary'}
      >
        {loading
          ? 'PROCESSING...'
          : alreadyAtLimit ? '購入上限に達しました'
          : !canAfford ? 'ポイント不足'
          : '応援する'}
      </ModalButton>
      <ModalButton onClick={onClose} variant="ghost" style={{ marginTop: 8 }}>
        キャンセル
      </ModalButton>
    </>
  )
}

// ============================================================
// 成功画面（ランクアップなし）
// ============================================================
function SuccessView({ card, onClose }: { card: IllustrationCard; onClose: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: 10,
        fontWeight: 700, letterSpacing: '0.3em',
        color: 'var(--mint)', marginBottom: 16,
      }}>
        ありがとう ✦
      </div>
      <div style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: 18,
        fontWeight: 800, letterSpacing: '0.05em', marginBottom: 6,
      }}>
        {card.title}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)',
        marginBottom: 28, letterSpacing: '0.06em',
      }}>
        を受け取りました
      </div>
      <ModalButton onClick={onClose} variant="primary">OK</ModalButton>
    </div>
  )
}

// ============================================================
// ランクアップ画面
// ============================================================
function RankUpView({
  card,
  rankUp,
  unlockedDecorations,
  onClose,
}: {
  card: IllustrationCard
  rankUp: RankUp
  unlockedDecorations: Decoration[]
  onClose: () => void
}) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      {/* 購入完了 */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)',
        letterSpacing: '0.06em', marginBottom: 20,
      }}>
        {card.title} を受け取りました
      </div>

      {/* ランクアップ表示 */}
      <div style={{
        border: '1px solid var(--mint)',
        borderRadius: 2,
        padding: '16px 20px',
        marginBottom: 20,
        background: 'rgba(111,255,224,0.05)',
      }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: 11,
          fontWeight: 700, letterSpacing: '0.3em',
          color: 'var(--mint)', marginBottom: 10,
          textShadow: '0 0 8px rgba(111,255,224,0.5)',
        }}>
          RANK UP !
        </div>
        <div style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: 16,
          fontWeight: 800, letterSpacing: '0.05em', marginBottom: 10,
        }}>
          {rankUp.from} → {rankUp.to}
        </div>

        {/* 解放された装飾 */}
        {unlockedDecorations.length > 0 && (
          <>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--ink-soft)',
              letterSpacing: '0.1em', marginBottom: 8,
            }}>
              新しい装飾が解放されました
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {unlockedDecorations.map((d) => (
                <div key={d.id} style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--ink)', letterSpacing: '0.04em',
                }}>
                  ✦ {d.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ModalButton onClick={onClose} variant="primary">OK</ModalButton>
    </div>
  )
}

// ============================================================
// エラー画面
// ============================================================
function ErrorView({
  errorType,
  onRetry,
  onClose,
}: {
  errorType: ErrorType
  onRetry: () => void
  onClose: () => void
}) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)',
        marginBottom: 24, lineHeight: 1.7,
      }}>
        {ERROR_MSG[errorType]}
      </div>
      {errorType === 'unknown' && (
        <ModalButton onClick={onRetry} variant="primary" style={{ marginBottom: 8 }}>
          再試行
        </ModalButton>
      )}
      <ModalButton onClick={onClose} variant="ghost">閉じる</ModalButton>
    </div>
  )
}

// ============================================================
// 共通ボタン
// ============================================================
function ModalButton({
  onClick,
  disabled,
  variant,
  children,
  style: extraStyle,
}: {
  onClick: () => void
  disabled?: boolean
  variant: 'primary' | 'ghost' | 'disabled'
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: 42,
    border: '1px solid',
    borderRadius: 2,
    fontFamily: 'Orbitron, "Noto Sans JP", sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.2em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...extraStyle,
  }

  if (variant === 'primary') {
    return (
      <button onClick={onClick} disabled={disabled} style={{
        ...base,
        background: 'var(--ink)', color: 'var(--mint)',
        borderColor: 'var(--mint)', opacity: disabled ? 0.45 : 1,
      }}>
        {children}
      </button>
    )
  }
  if (variant === 'ghost') {
    return (
      <button onClick={onClick} style={{
        ...base,
        background: 'transparent', color: 'var(--ink-faint)',
        borderColor: 'var(--hair-strong)',
      }}>
        {children}
      </button>
    )
  }
  return (
    <button disabled style={{
      ...base,
      background: 'transparent', color: 'var(--ink-faint)',
      borderColor: 'var(--hair)', cursor: 'not-allowed',
    }}>
      {children}
    </button>
  )
}

// コーナーデコレーション
function CornerMark({ pos }: { pos: 'top' | 'bottom' }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 8, height: 8,
    borderStyle: 'solid', borderWidth: 0,
    borderColor: 'var(--ink)',
  }
  return <span style={pos === 'top'
    ? { ...base, top: -1, left: -1, borderTopWidth: 1, borderLeftWidth: 1 }
    : { ...base, bottom: -1, right: -1, borderBottomWidth: 1, borderRightWidth: 1 }
  } />
}
