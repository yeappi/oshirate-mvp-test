'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'

type Props = {
  initialName: string
  initialAvatarUrl: string
  initialComment: string
}

export default function ProfileEditForm({
  initialName,
  initialAvatarUrl,
  initialComment,
}: Props) {
  const [name, setName]               = useState(initialName)
  const [avatarUrl, setAvatarUrl]     = useState(initialAvatarUrl)
  const [comment, setComment]         = useState(initialComment)
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<string | null>(null)
  const [saved, setSaved]             = useState(false)
  const [imgError, setImgError]       = useState(false)

  // URLが変わったらプレビューエラー状態をリセット
  const handleAvatarUrlChange = (v: string) => {
    setAvatarUrl(v)
    setImgError(false)
  }

  const handleSave = async () => {
    setLoading(true)
    setResult(null)
    setSaved(false)

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatar_url: avatarUrl, profile_comment: comment }),
    })
    const json = await res.json()
    setLoading(false)

    if (json.ok) {
      setResult('✓ 保存しました')
      setSaved(true)
    } else {
      setResult(`✗ ${json.error}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* アバタープレビュー */}
      {avatarUrl && (
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          {imgError ? (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '1px solid var(--hair-strong)',
              display: 'grid', placeItems: 'center',
              margin: '0 auto',
              fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.04em',
            }}>
              読込失敗
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={avatarUrl}
              src={avatarUrl}
              alt="プレビュー"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                objectFit: 'cover', border: '1px solid var(--hair-strong)',
              }}
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )}

      {/* 表示名 */}
      <div>
        <label style={labelStyle}>表示名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: やぴ"
          maxLength={30}
          style={inputStyle}
        />
      </div>

      {/* アイコン画像URL */}
      <div>
        <label style={labelStyle}>アイコン画像URL</label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => handleAvatarUrlChange(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
        <div style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 4, letterSpacing: '0.04em' }}>
          https:// または http:// で始まるURLを入力してください
        </div>
      </div>

      {/* ひとこと */}
      <div>
        <label style={labelStyle}>ひとこと</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="プロフィールに表示されるコメントを入力..."
          maxLength={140}
          rows={3}
          style={{
            ...inputStyle,
            height: 'auto',
            resize: 'vertical',
            padding: '8px 10px',
          }}
        />
        <div style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 4, textAlign: 'right' }}>
          {comment.length}/140
        </div>
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          height: 42,
          border: '1px solid var(--mint)',
          borderRadius: 2,
          background: 'var(--ink)',
          color: 'var(--mint)',
          fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.2em',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '保存中...' : '保存する'}
      </button>

      {/* 結果表示 */}
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

      {/* 保存成功後の戻りリンク */}
      {saved && (
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
      )}
    </div>
  )
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--ink-soft)',
  letterSpacing: '0.08em',
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: '100%',
  height: 36,
  border: '1px solid var(--hair-strong)',
  borderRadius: 2,
  padding: '0 10px',
  fontSize: 12,
  fontFamily: "'Noto Sans JP', sans-serif",
  color: 'var(--ink)',
  background: 'rgba(255,255,255,0.7)',
  outline: 'none',
  boxSizing: 'border-box',
}
