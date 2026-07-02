'use client'

import { useState } from 'react'
import { adminStyles as s } from './adminStyles'

type Announcement = {
  id: string
  title: string
  content: string
  is_active: boolean
}

type Props = {
  initial: Announcement | null
}

export default function AnnouncementForm({ initial }: Props) {
  const [id]                    = useState(initial?.id ?? undefined)
  const [title, setTitle]       = useState(initial?.title ?? '')
  const [content, setContent]   = useState(initial?.content ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/admin/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, content, is_active: isActive }),
    })
    const json = await res.json()
    setLoading(false)
    setResult(json.ok ? '✓ 保存しました' : `✗ エラー: ${json.error}`)
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={s.label}>タイトル</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 実験参加者への連絡" style={s.input} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={s.label}>本文</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="告知の内容を入力..." style={s.textarea} rows={4} />
      </div>

      {/* 表示/非表示トグル */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button
          onClick={() => setIsActive(!isActive)}
          style={{
            width: 36, height: 20, borderRadius: 10,
            border: 'none', cursor: 'pointer',
            background: isActive ? 'var(--ink)' : 'var(--hair-strong)',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3, left: isActive ? 18 : 3,
            width: 14, height: 14,
            borderRadius: 7,
            background: isActive ? 'var(--mint)' : 'var(--ink-faint)',
            transition: 'left 0.2s',
          }} />
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
          {isActive ? '表示中' : '非表示'}
        </span>
      </div>

      <button onClick={handleSave} disabled={loading || !title.trim() || !content.trim()}
        style={{ ...s.primaryBtn, opacity: loading ? 0.5 : 1 }}>
        {loading ? '保存中...' : '保存する'}
      </button>

      {result && (
        <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700,
          color: result.startsWith('✓') ? '#007a5e' : '#b40a0a' }}>
          {result}
        </div>
      )}
    </div>
  )
}
