'use client'

import { useState } from 'react'
import Link from 'next/link'

type TagVariant = 'rare' | 'high' | 'mid' | 'low'

type OwnedTag = {
  id: string
  label: string
  variant: TagVariant
  description: string | null
  is_selected: boolean
  display_order: number | null
}

type Props = {
  tags: OwnedTag[]
}

const MAX_TAGS = 6

export default function TagSelectForm({ tags }: Props) {
  const initialSelected = tags
    .filter((tag) => tag.is_selected)
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))
    .map((tag) => tag.id)
    .slice(0, MAX_TAGS)

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const toggleTag = (tagId: string) => {
    setResult(null)
    setSelectedIds((current) => {
      if (current.includes(tagId)) return current.filter((id) => id !== tagId)
      if (current.length >= MAX_TAGS) {
        setResult(`プロフィールに貼れるタグは最大${MAX_TAGS}個までです`)
        return current
      }
      return [...current, tagId]
    })
  }

  const save = async () => {
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/profile/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: selectedIds }),
    })
    const json = await res.json()
    setLoading(false)

    if (json.ok) {
      setResult('✓ 保存しました')
    } else {
      setResult(`✗ ${json.error ?? '保存に失敗しました'}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: '10px 0',
        borderTop: '1px solid var(--hair)',
        borderBottom: '1px solid var(--hair)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>
          DISPLAY TAGS
        </span>
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 800 }}>
          {selectedIds.length}/{MAX_TAGS}
        </span>
      </div>

      {tags.length === 0 ? (
        <div style={{
          border: '1px solid var(--hair-strong)',
          borderRadius: 2,
          padding: 18,
          textAlign: 'center',
          color: 'var(--ink-faint)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}>
          まだ所持タグがありません
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {tags.map((tag) => {
            const selectedIndex = selectedIds.indexOf(tag.id)
            const selected = selectedIndex !== -1
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                style={{
                  width: '100%',
                  border: selected ? '1px solid var(--mint)' : '1px solid var(--hair-strong)',
                  borderRadius: 2,
                  background: selected ? 'rgba(111,255,224,0.12)' : 'rgba(255,255,255,0.58)',
                  color: 'var(--ink)',
                  padding: '12px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className={`tag-chip ${tag.variant}`} style={{ alignSelf: 'flex-start' }}>
                    {tag.label}
                  </span>
                  {tag.description && (
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
                      {tag.description}
                    </span>
                  )}
                </span>
                <span style={{
                  minWidth: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: selected ? '1px solid var(--mint)' : '1px solid var(--hair)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: 11,
                  fontWeight: 800,
                  color: selected ? 'var(--ink)' : 'var(--ink-faint)',
                }}>
                  {selected ? selectedIndex + 1 : '+'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        style={{
          display: 'block', width: '100%', height: 42,
          border: '1px solid var(--mint)', borderRadius: 2,
          background: 'var(--ink)', color: 'var(--mint)',
          fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
          fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '保存中...' : '保存する'}
      </button>

      {result && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: result.startsWith('✓') ? '#007a5e' : '#b40a0a',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          {result}
        </div>
      )}

      <Link href="/" style={{
        display: 'block', textAlign: 'center',
        fontSize: 11, fontWeight: 700,
        color: 'var(--ink-soft)', textDecoration: 'none',
        letterSpacing: '0.08em',
        border: '1px solid var(--hair-strong)',
        borderRadius: 2, padding: '10px 0',
      }}>
        ← プロフィールへ戻る
      </Link>
    </div>
  )
}
