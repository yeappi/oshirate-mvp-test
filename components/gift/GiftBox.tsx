'use client'

import { useState, useEffect, useCallback } from 'react'

// ============================================================
// 型
// ============================================================
type SlotData = {
  id: string
  table_type: 'normal' | 'gold'
  options: [number, number, number]
  status: 'pending' | 'claimed'
  selected_index: number | null
  selected_point: number | null
  available_at: string
}

type GiftState =
  | { phase: 'loading' }
  | { phase: 'pending'; slot: SlotData }
  | { phase: 'waiting'; availableAt: Date }
  | { phase: 'revealing'; slot: SlotData; chosenIndex: number; earnedPt: number }
  | { phase: 'error'; message: string }

// ============================================================
// ヘルパー
// ============================================================
function formatPt(pt: number): string {
  return pt.toLocaleString() + 'pt'
}

function useCountdown(target: Date | null) {
  const [remaining, setRemaining] = useState<string>('')

  useEffect(() => {
    if (!target) return
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('00:00')
        return
      }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return remaining
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function GiftBox() {
  const [state, setState] = useState<GiftState>({ phase: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  const fetchGift = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await fetch('/api/gift')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'fetch failed')

      if (json.state === 'pending') {
        setState({ phase: 'pending', slot: json.slot })
      } else if (json.state === 'waiting') {
        setState({ phase: 'waiting', availableAt: new Date(json.availableAt) })
      }
    } catch (e) {
      setState({ phase: 'error', message: String(e) })
    }
  }, [])

  useEffect(() => { fetchGift() }, [fetchGift])

  const handleSelect = async (index: 0 | 1 | 2) => {
    if (state.phase !== 'pending' || submitting) return
    setSubmitting(true)
    const slotId = state.slot.id
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, selectedIndex: index }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'claim failed')

      setState({
        phase: 'revealing',
        slot: state.slot,
        chosenIndex: index,
        earnedPt: json.selectedPoint,
      })
    } catch (e) {
      setState({ phase: 'error', message: String(e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{ marginTop: 14 }}>
      <GiftInner state={state} onSelect={handleSelect} onRefresh={fetchGift} submitting={submitting} />
    </section>
  )
}

// ============================================================
// GiftInner — state別レンダリング
// ============================================================
function GiftInner({
  state,
  onSelect,
  onRefresh,
  submitting,
}: {
  state: GiftState
  onSelect: (i: 0 | 1 | 2) => void
  onRefresh: () => void
  submitting: boolean
}) {
  const countdown = useCountdown(
    state.phase === 'waiting' ? state.availableAt : null
  )

  // カウントダウンが0になったら自動更新
  useEffect(() => {
    if (state.phase === 'waiting' && countdown === '00:00') {
      const id = setTimeout(onRefresh, 800)
      return () => clearTimeout(id)
    }
  }, [state.phase, countdown, onRefresh])

  if (state.phase === 'loading') {
    return <GiftCard><LoadingDots /></GiftCard>
  }

  if (state.phase === 'error') {
    return (
      <GiftCard>
        <p style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center' }}>
          エラーが発生しました
        </p>
        <button onClick={onRefresh} style={{
          display: 'block',
          width: '100%',
          marginTop: 12,
          height: 34,
          border: '1px solid var(--mint)',
          borderRadius: 2,
          background: 'var(--ink)',
          color: 'var(--mint)',
          fontFamily: 'Orbitron, "Noto Sans JP", sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.3em',
          cursor: 'pointer',
        }}>
          再試行
        </button>
      </GiftCard>
    )
  }

  if (state.phase === 'waiting') {
    return (
      <GiftCard>
        <SectionLabel>30MIN PRESENT</SectionLabel>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-soft)', marginBottom: 10, letterSpacing: '0.06em', fontWeight: 700 }}>
          次のプレゼントまで
        </p>
        <div style={{
          textAlign: 'center',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '0.05em',
          color: 'var(--ink)',
        }}>
          {countdown}
        </div>
      </GiftCard>
    )
  }

  if (state.phase === 'pending') {
    const isGold = state.slot.table_type === 'gold'
    return (
      <GiftCard gold={isGold}>
        <SectionLabel gold={isGold}>30MIN PRESENT</SectionLabel>
        <p style={{
          textAlign: 'center',
          fontSize: 10,
          color: isGold ? 'rgba(180,140,0,0.75)' : 'var(--ink-soft)',
          marginBottom: 14,
          letterSpacing: '0.06em',
          fontWeight: 700,
        }}>
          1つ選んで受け取る
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {([0, 1, 2] as const).map((i) => (
            <GiftOption
              key={i}
              onClick={() => onSelect(i)}
              disabled={submitting}
              gold={isGold}
            />
          ))}
        </div>
      </GiftCard>
    )
  }

  if (state.phase === 'revealing') {
    const isGold = state.slot.table_type === 'gold'
    return (
      <GiftCard gold={isGold}>
        <SectionLabel gold={isGold}>30MIN PRESENT</SectionLabel>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            color: isGold ? 'rgba(180,140,0,0.75)' : 'var(--ink-soft)',
            letterSpacing: '0.12em',
            marginBottom: 6,
          }}>
            獲得
          </div>
          <div style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 36,
            fontWeight: 800,
            color: 'var(--ink)',
          }}>
            {formatPt(state.earnedPt)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {([0, 1, 2] as const).map((i) => (
            <RevealOption
              key={i}
              pt={state.slot.options[i]}
              isChosen={i === state.chosenIndex}
              gold={isGold}
            />
          ))}
        </div>
        <button onClick={onRefresh} style={{
          display: 'block',
          width: '100%',
          marginTop: 14,
          height: 34,
          border: '1px solid var(--mint)',
          borderRadius: 2,
          background: 'var(--ink)',
          color: 'var(--mint)',
          fontFamily: 'Orbitron, "Noto Sans JP", sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          cursor: 'pointer',
        }}>
          OK
        </button>
      </GiftCard>
    )
  }

  return null
}

// ============================================================
// 小コンポーネント
// ============================================================
function GiftCard({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div style={{
      borderRadius: 2,
      background: gold
        ? 'linear-gradient(155deg, rgba(255,248,220,0.7), rgba(255,215,0,0.08))'
        : 'rgba(255,255,255,0.5)',
      outline: `1px solid ${gold ? 'rgba(180,140,0,0.35)' : 'var(--hair)'}`,
      outlineOffset: -1,
      padding: '15px 18px 18px',
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div style={{
      fontFamily: 'Orbitron, sans-serif',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.2em',
      textAlign: 'center',
      marginBottom: 12,
      color: gold ? 'rgba(140,100,0,0.8)' : 'var(--ink)',
    }}>
      {children}
    </div>
  )
}

function GiftOption({ onClick, disabled, gold }: { onClick: () => void; disabled: boolean; gold: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        aspectRatio: '1',
        border: `1px solid ${gold ? 'rgba(180,140,0,0.5)' : 'var(--hair-strong)'}`,
        background: gold
          ? 'linear-gradient(155deg, rgba(255,248,220,0.6), rgba(255,215,0,0.15))'
          : 'linear-gradient(155deg, rgba(255,255,255,0.5), rgba(111,255,224,0.08))',
        borderRadius: 2,
        cursor: disabled ? 'wait' : 'pointer',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'Orbitron, sans-serif',
        fontSize: 22,
        color: gold ? 'rgba(140,100,0,0.6)' : 'var(--ink-faint)',
        transition: 'opacity 0.1s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      ✦
    </button>
  )
}

function RevealOption({ pt, isChosen, gold }: { pt: number; isChosen: boolean; gold: boolean }) {
  return (
    <div style={{
      position: 'relative',
      aspectRatio: '1',
      border: `1px solid ${isChosen
        ? (gold ? 'rgba(180,140,0,0.7)' : 'var(--ink)')
        : 'var(--hair)'}`,
      background: isChosen
        ? (gold ? 'rgba(255,215,0,0.12)' : 'rgba(111,255,224,0.1)')
        : 'rgba(255,255,255,0.3)',
      borderRadius: 2,
      display: 'grid',
      placeItems: 'center',
      opacity: isChosen ? 1 : 0.45,
    }}>
      <div style={{
        fontFamily: 'Orbitron, sans-serif',
        fontSize: 11,
        fontWeight: 800,
        color: 'var(--ink)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {pt.toLocaleString()}
        <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--ink-faint)' }}>pt</div>
      </div>
      {isChosen && (
        <div style={{
          position: 'absolute',
          top: 3,
          right: 4,
          fontSize: 7,
          fontFamily: 'Orbitron, sans-serif',
          color: gold ? 'rgba(140,100,0,0.7)' : 'var(--ink-soft)',
          fontWeight: 700,
        }}>
          ✓
        </div>
      )}
    </div>
  )
}

function LoadingDots() {
  return (
    <div style={{
      textAlign: 'center',
      fontFamily: 'Orbitron, sans-serif',
      fontSize: 11,
      color: 'var(--ink-faint)',
      letterSpacing: '0.2em',
      padding: '12px 0',
    }}>
      . . .
    </div>
  )
}
