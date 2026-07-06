'use client'

import { useMemo, useState } from 'react'
import type { ItemTargetCandidate, OwnedItem } from '@/lib/items'
import { getItemTypeLabel } from '@/lib/itemTypes'

type Props = {
  initialItems: OwnedItem[]
  candidates: ItemTargetCandidate[]
}

const ERROR_MESSAGES: Record<string, string> = {
  item_not_found: 'アイテムが見つかりません',
  not_owner: 'このアイテムは使用できません',
  already_used: 'このアイテムは使用済みです',
  expired: 'このアイテムは期限切れです',
  target_not_found: '使用先が見つかりません',
  target_not_followed: 'フォロー中の相手にだけ贈れます',
  target_already_owns: '相手はすでにこのイラストを持っています',
  item_inactive: 'このアイテムは現在使用できません',
  unknown: '使用に失敗しました',
}

export default function ItemsClient({ initialItems, candidates }: Props) {
  const [items, setItems] = useState(initialItems)
  const [selected, setSelected] = useState<OwnedItem | null>(null)
  const [targetUserId, setTargetUserId] = useState(candidates[0]?.id ?? '')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const grouped = useMemo(() => ({
    available: items.filter((item) => item.status === 'available'),
    expired: items.filter((item) => item.status === 'expired'),
    used: items.filter((item) => item.status === 'used'),
  }), [items])

  const openUse = (item: OwnedItem) => {
    if (item.status !== 'available') return
    setMessage(null)
    setSelected(item)
    setTargetUserId(candidates[0]?.id ?? '')
  }

  const useItem = async () => {
    if (!selected || busyId) return
    setBusyId(selected.userItemId)
    setMessage(null)

    try {
      const res = await fetch('/api/items/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userItemId: selected.userItemId,
          targetUserId: selected.itemType === 'ILLUST_TICKET' ? targetUserId : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setMessage(`✗ ${ERROR_MESSAGES[json.error] ?? ERROR_MESSAGES.unknown}`)
        return
      }

      setItems((current) => current.map((item) => (
        item.userItemId === selected.userItemId
          ? { ...item, status: 'used', usedAt: new Date().toISOString(), usedTargetUserId: targetUserId }
          : item
      )))
      setSelected(null)
      setMessage('✓ アイテムを使用しました')
    } catch {
      setMessage(`✗ ${ERROR_MESSAGES.unknown}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <section className="collection-card" style={{ marginTop: 10 }}>
        <div className="collection-head">
          <div className="collection-title">MOCHIMONO</div>
          <div className="collection-count">{grouped.available.length}</div>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 11, lineHeight: 1.8, fontWeight: 700, color: 'var(--ink-soft)' }}>
          限定イラスト券は、自分かフォロー中の人に贈れます。背景・枠・タグ券は自分に解放されます。
        </p>
        {message && (
          <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 800, color: message.startsWith('✓') ? '#007a5e' : '#b40a0a' }}>
            {message}
          </div>
        )}
        <ItemGroup title="使える" items={grouped.available} onUse={openUse} busyId={busyId} />
        <ItemGroup title="期限切れ" items={grouped.expired} onUse={openUse} busyId={busyId} muted />
        <ItemGroup title="使用済み" items={grouped.used} onUse={openUse} busyId={busyId} muted />
      </section>

      {selected && (
        <div>
          <div onClick={() => { if (!busyId) setSelected(null) }} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(7,17,14,0.55)' }} />
          <div style={{
            position: 'fixed', left: '50%', bottom: 0, transform: 'translateX(-50%)',
            width: 'min(100%, 420px)', zIndex: 101, background: 'var(--paper)',
            borderTop: '1px solid var(--hair-strong)', padding: '22px 22px 38px',
          }}>
            <div style={{ width: 32, height: 2, background: 'var(--hair-strong)', margin: '0 auto 18px' }} />
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', color: 'var(--mint)', marginBottom: 8 }}>
              USE ITEM
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 800, marginBottom: 16 }}>
              {getItemTypeLabel(selected.itemType)} / {selected.targetLabel}
            </div>

            {selected.itemType === 'ILLUST_TICKET' ? (
              <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--ink-soft)', letterSpacing: '0.12em' }}>贈る相手</div>
                {candidates.map((candidate) => {
                  const candidateName = candidate.name ?? 'ユーザー'
                  return (
                  <label key={candidate.id} style={{
                    border: targetUserId === candidate.id ? '1px solid var(--mint)' : '1px solid var(--hair-strong)',
                    padding: 10, display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 10, alignItems: 'center',
                    background: targetUserId === candidate.id ? 'rgba(61,219,184,0.09)' : 'rgba(255,255,255,0.55)',
                    cursor: 'pointer',
                  }}>
                    <span style={{ width: 32, height: 32, borderRadius: 999, overflow: 'hidden', border: '1px solid var(--hair)', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                      {candidate.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : candidateName.slice(0, 1)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>{candidate.isSelf ? '自分' : candidateName}</span>
                      <span style={{ display: 'block', fontSize: 9, fontFamily: 'Orbitron, sans-serif', color: 'var(--ink-faint)', fontWeight: 800 }}>
                        {Number(candidate.charisma ?? 0).toLocaleString()} CHARISMA
                      </span>
                    </span>
                    <input type="radio" checked={targetUserId === candidate.id} onChange={() => setTargetUserId(candidate.id)} />
                  </label>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontSize: 11, lineHeight: 1.8, color: 'var(--ink-soft)', fontWeight: 700, marginBottom: 18 }}>
                このアイテムは自分のプロフィールに解放されます。解放後、プロフィール編集から選択できます。
              </div>
            )}

            <button
              type="button"
              disabled={busyId === selected.userItemId || (selected.itemType === 'ILLUST_TICKET' && !targetUserId)}
              onClick={useItem}
              style={{
                width: '100%', height: 42, border: '1px solid var(--mint)', background: 'var(--ink)', color: 'var(--mint)',
                fontFamily: 'Orbitron, sans-serif', fontWeight: 900, letterSpacing: '0.18em', cursor: busyId ? 'wait' : 'pointer',
              }}
            >
              {busyId === selected.userItemId ? 'USING...' : '使う'}
            </button>
            <button type="button" onClick={() => setSelected(null)} disabled={Boolean(busyId)} style={{
              marginTop: 8, width: '100%', height: 42, border: '1px solid var(--hair-strong)', background: 'transparent', color: 'var(--ink-faint)',
              fontWeight: 800, letterSpacing: '0.08em', opacity: busyId ? 0.45 : 1, cursor: busyId ? 'wait' : 'pointer',
            }}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function ItemGroup({
  title,
  items,
  onUse,
  busyId,
  muted = false,
}: {
  title: string
  items: OwnedItem[]
  onUse: (item: OwnedItem) => void
  busyId: string | null
  muted?: boolean
}) {
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
      <div style={{ fontSize: 10, fontFamily: 'Orbitron, sans-serif', fontWeight: 900, letterSpacing: '0.16em', color: 'var(--ink-soft)' }}>
        {title} / {items.length}
      </div>
      {items.length === 0 ? (
        <div style={{ border: '1px solid var(--hair)', padding: 14, color: 'var(--ink-faint)', fontSize: 11, fontWeight: 700 }}>
          なし
        </div>
      ) : items.map((item) => (
        <button
          key={item.userItemId}
          type="button"
          disabled={item.status !== 'available' || Boolean(busyId)}
          onClick={() => onUse(item)}
          style={{
            width: '100%', display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 12, alignItems: 'center',
            border: item.itemType === 'ILLUST_TICKET' ? '1px solid rgba(204,152,45,0.65)' : '1px solid var(--hair-strong)',
            background: item.itemType === 'ILLUST_TICKET' ? 'linear-gradient(135deg, rgba(255,246,210,0.82), rgba(255,255,255,0.72))' : 'rgba(255,255,255,0.62)',
            padding: 10, textAlign: 'left', opacity: muted ? 0.55 : busyId ? 0.72 : 1, cursor: busyId ? 'wait' : item.status === 'available' ? 'pointer' : 'default',
          }}
        >
          <span style={{
            width: 56, height: 56, border: '1px solid var(--hair)', background: 'rgba(7,17,14,0.04)', display: 'grid', placeItems: 'center', overflow: 'hidden',
            fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 900,
          }}>
            {item.targetImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.targetImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : item.itemType === 'BACKGROUND_TICKET' ? 'BG' : item.itemType === 'FRAME_TICKET' ? 'FR' : item.itemType === 'TAG_TICKET' ? 'TAG' : '✦'}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 900, color: 'var(--ink)' }}>{item.name}</span>
            <span style={{ display: 'block', marginTop: 3, fontSize: 9, color: 'var(--ink-soft)', fontWeight: 800 }}>
              {getItemTypeLabel(item.itemType)} / {item.targetLabel}
            </span>
            <span style={{ display: 'block', marginTop: 3, fontSize: 9, color: 'var(--ink-faint)', fontWeight: 700 }}>
              {item.expiresAt ? `期限 ${new Date(item.expiresAt).toLocaleDateString('ja-JP')}` : '期限なし'}
            </span>
          </span>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 9, fontWeight: 900, color: item.status === 'available' ? 'var(--ink)' : 'var(--ink-faint)' }}>
            {item.status === 'available' ? 'USE' : item.status === 'expired' ? 'EXPIRED' : 'USED'}
          </span>
        </button>
      ))}
    </div>
  )
}
