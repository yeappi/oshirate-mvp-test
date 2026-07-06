'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { AvatarFrame } from '@/lib/avatarFrames'

function isFrameUnlocked(frame: Pick<AvatarFrame, 'id' | 'required_charisma'>, charisma: number, itemUnlockedIds: string[]): boolean {
  return charisma >= frame.required_charisma || itemUnlockedIds.includes(frame.id)
}

type Props = {
  frames: AvatarFrame[]
  selectedFrameId: string
  charisma: number
  itemUnlockedIds: string[]
}

export default function FrameSelectForm({
  frames,
  selectedFrameId,
  charisma,
  itemUnlockedIds,
}: Props) {
  const [selectedId, setSelectedId] = useState(selectedFrameId)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const nextFrame = useMemo(() => {
    return frames.find((frame) => frame.required_charisma > charisma) ?? null
  }, [frames, charisma])

  const handleSelect = async (frame: AvatarFrame) => {
    if (savingId || !isFrameUnlocked(frame, charisma, itemUnlockedIds)) return

    setSavingId(frame.id)
    setMessage(null)

    try {
      const res = await fetch('/api/profile/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameId: frame.id }),
      })
      const json = await res.json()

      if (json.ok) {
        setSelectedId(frame.id)
        setMessage('✓ フレームを保存しました')
      } else {
        setMessage(`✗ ${json.error ?? '保存に失敗しました'}`)
      }
    } catch {
      setMessage('✗ 保存に失敗しました。通信状態を確認してください')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.7, letterSpacing: '0.04em' }}>
        魅力値に応じて、アイコンフレームが解放されます。
        フレームは「推されているオーラ」の土台になります。
      </div>

      <div style={{
        padding: '10px 0',
        borderTop: '1px solid var(--hair)',
        borderBottom: '1px solid var(--hair)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 8,
        alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>
          魅力値
        </span>
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 800 }}>
          {charisma.toLocaleString()}
        </span>
        {nextFrame && (
          <span style={{ gridColumn: '1 / -1', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.05em' }}>
            次の「{nextFrame.name}」まであと {(nextFrame.required_charisma - charisma).toLocaleString()} 魅力値
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {frames.map((frame) => {
          const unlocked = isFrameUnlocked(frame, charisma, itemUnlockedIds)
          const selected = selectedId === frame.id
          const saving = savingId === frame.id

          return (
            <button
              key={frame.id}
              type="button"
              disabled={!unlocked || savingId !== null}
              onClick={() => handleSelect(frame)}
              style={{
                display: 'grid',
                gridTemplateColumns: '72px 1fr auto',
                gap: 10,
                alignItems: 'center',
                width: '100%',
                padding: 10,
                border: selected ? '1px solid var(--mint)' : '1px solid var(--hair-strong)',
                borderRadius: 2,
                background: selected ? 'rgba(111,255,224,0.09)' : 'rgba(255,255,255,0.38)',
                color: 'var(--ink)',
                opacity: unlocked ? 1 : 0.42,
                cursor: savingId ? 'wait' : unlocked ? 'pointer' : 'not-allowed',
                textAlign: 'left',
              }}
            >
              <span
                className="frame-preview"
                data-avatar-frame={frame.css_key}
                aria-hidden="true"
              >
                <span />
              </span>

              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}>
                  {frame.name}
                </span>
                <span style={{
                  display: 'block',
                  marginTop: 3,
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.06em',
                }}>
                  {itemUnlockedIds.includes(frame.id) ? 'アイテム解放済み' : `${frame.required_charisma.toLocaleString()} 魅力値で解放`}
                </span>
                {frame.description && (
                  <span style={{
                    display: 'block',
                    marginTop: 4,
                    fontSize: 9,
                    lineHeight: 1.5,
                    color: 'var(--ink-soft)',
                  }}>
                    {frame.description}
                  </span>
                )}
              </span>

              <span style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 9,
                fontWeight: 800,
                color: selected ? 'var(--ink)' : 'var(--ink-faint)',
                whiteSpace: 'nowrap',
              }}>
                {saving ? '保存中' : selected ? 'SELECTED' : unlocked ? 'SET' : 'LOCK'}
              </span>
            </button>
          )
        })}
      </div>

      {message && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: message.startsWith('✓') ? '#007a5e' : '#b40a0a',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          {message}
        </div>
      )}

      <Link href="/" style={{
        display: 'block',
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--ink-soft)',
        textDecoration: 'none',
        letterSpacing: '0.08em',
        border: '1px solid var(--hair-strong)',
        borderRadius: 2,
        padding: '10px 0',
      }}>
        ← プロフィールへ戻る
      </Link>
    </div>
  )
}
