'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProfileBackground } from '@/lib/backgrounds'
import { isBackgroundUnlocked } from '@/lib/backgrounds'

type Props = {
  backgrounds: ProfileBackground[]
  selectedBackgroundId: string
  currentLv: number
}

export default function BackgroundSelectForm({
  backgrounds,
  selectedBackgroundId,
  currentLv,
}: Props) {
  const [selectedId, setSelectedId] = useState(selectedBackgroundId)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSelect = async (background: ProfileBackground) => {
    if (!isBackgroundUnlocked(background, currentLv)) return

    setSavingId(background.id)
    setMessage(null)

    const res = await fetch('/api/profile/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backgroundId: background.id }),
    })
    const json = await res.json()
    setSavingId(null)

    if (json.ok) {
      setSelectedId(background.id)
      setMessage('✓ 背景を保存しました')
    } else {
      setMessage(`✗ ${json.error ?? '保存に失敗しました'}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.7, letterSpacing: '0.04em' }}>
        Lvが上がると選べる背景が増えます。今は仮のCSS背景です。後で素材に差し替えできます。
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {backgrounds.map((background) => {
          const unlocked = isBackgroundUnlocked(background, currentLv)
          const selected = selectedId === background.id
          const saving = savingId === background.id

          return (
            <button
              key={background.id}
              type="button"
              disabled={!unlocked || savingId !== null}
              onClick={() => handleSelect(background)}
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
                cursor: unlocked && savingId === null ? 'pointer' : 'not-allowed',
                textAlign: 'left',
              }}
            >
              <span
                className="bg-preview"
                data-profile-bg={background.css_key}
                aria-hidden="true"
                style={{ width: 72, height: 48, borderRadius: 2, border: '1px solid var(--hair)' }}
              />

              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}>
                  {background.name}
                </span>
                <span style={{
                  display: 'block',
                  marginTop: 3,
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.06em',
                }}>
                  Lv{background.required_level} 解放
                </span>
                {background.description && (
                  <span style={{
                    display: 'block',
                    marginTop: 4,
                    fontSize: 9,
                    lineHeight: 1.5,
                    color: 'var(--ink-soft)',
                  }}>
                    {background.description}
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
