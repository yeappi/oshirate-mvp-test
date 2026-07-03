'use client'

import { useState, useRef, useEffect } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'

// ============================================================
// 画像圧縮ユーティリティ
// ============================================================
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_SIDE = 512
const MAX_BYTES = 1024 * 1024 // 1MB

// canvas に描画して Blob を得る共通処理
async function drawAndCompress(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number
): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const tw = Math.round(width * scale)
  const th = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source as CanvasImageSource, 0, 0, tw, th)

  const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg'

  const toBlob = (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob に失敗しました'))),
        mimeType,
        quality
      )
    })

  for (const q of [0.8, 0.6, 0.4]) {
    const blob = await toBlob(q)
    if (blob.size <= MAX_BYTES) return blob
  }
  throw new Error('画像を圧縮しても 1MB を超えています。より小さい画像を選んでください')
}

async function compressImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('jpg / png / webp のみ対応しています')
  }

  // 1st: createImageBitmap（モダンブラウザ向け）
  try {
    const bitmap = await createImageBitmap(file)
    try {
      return await drawAndCompress(bitmap, bitmap.width, bitmap.height)
    } finally {
      bitmap.close()
    }
  } catch {
    // Safari など createImageBitmap が不安定な場合の fallback
  }

  // 2nd fallback: Image + objectURL
  const objUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      el.src = objUrl
    })
    return await drawAndCompress(img, img.naturalWidth, img.naturalHeight)
  } finally {
    URL.revokeObjectURL(objUrl)
  }
}

// ============================================================
// コンポーネント
// ============================================================
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
  const [name, setName]       = useState(initialName)
  const [comment, setComment] = useState(initialComment)

  // アバター
  // previewUrl: 表示用URL（外部URLまたは objectURL）
  // objectUrlRef: revokeが必要なobjectURLだけを追跡（外部URLは追跡しない）
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl || null)
  const objectUrlRef                = useRef<string | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [pendingExt, setPendingExt]   = useState<string>('webp')
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const [imgStatus, setImgStatus]     = useState<string | null>(null)

  // unmount 時に objectURL を解放
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const setNewObjectUrl = (url: string) => {
    // 前の objectURL があれば先に解放
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setPreviewUrl(url)
  }

  // 保存全体
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgStatus('compressing')
    setResult(null)
    setSaved(false)

    try {
      const blob = await compressImage(file)
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      setPendingBlob(blob)
      setPendingExt(ext)
      setNewObjectUrl(URL.createObjectURL(blob))
      setImgStatus(null)
    } catch (err) {
      setImgStatus(err instanceof Error ? err.message : '画像の処理に失敗しました')
      setPendingBlob(null)
    }
    e.target.value = ''
  }

  const handleSave = async () => {
    setLoading(true)
    setResult(null)
    setSaved(false)

    let uploadedUrl: string | undefined

    if (pendingBlob) {
      try {
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('ログインが必要です')

        const ts = Date.now()
        const path = `${user.id}/avatar-${ts}.${pendingExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, pendingBlob, { contentType: pendingBlob.type, upsert: false })

        if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        uploadedUrl = publicUrl
      } catch (err) {
        setResult(`✗ ${err instanceof Error ? err.message : 'アップロードに失敗しました'}`)
        setLoading(false)
        return
      }
    }

    const body: Record<string, string> = { name, profile_comment: comment }
    if (uploadedUrl) body.avatar_url = uploadedUrl

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setLoading(false)

    if (json.ok) {
      setResult('✓ 保存しました')
      setSaved(true)
      setPendingBlob(null)
    } else {
      setResult(`✗ ${json.error}`)
    }
  }

  const busy = loading || imgStatus === 'compressing'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* アイコン */}
      <div style={{ textAlign: 'center' }}>
        <label style={labelStyle}>アイコン画像</label>

        <div style={{ marginBottom: 10 }}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="アイコンプレビュー"
              style={{
                width: 80, height: 80, borderRadius: '50%',
                objectFit: 'cover', border: '1px solid var(--hair-strong)',
                display: 'block', margin: '0 auto',
              }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              border: '1px solid var(--hair-strong)',
              display: 'grid', placeItems: 'center', margin: '0 auto',
              fontFamily: 'Orbitron, sans-serif', fontSize: 28,
              color: 'var(--ink-faint)', background: 'rgba(255,255,255,0.4)',
            }}>
              {name.charAt(0) || '?'}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          style={{
            height: 32, padding: '0 14px',
            border: '1px solid var(--hair-strong)', borderRadius: 2,
            background: 'transparent', color: 'var(--ink-soft)',
            fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
            fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          画像を選ぶ
        </button>

        {imgStatus === 'compressing' && (
          <div style={{ marginTop: 6, fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.06em' }}>
            圧縮中...
          </div>
        )}
        {imgStatus && imgStatus !== 'compressing' && (
          <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: '#b40a0a' }}>
            {imgStatus}
          </div>
        )}
        {!imgStatus && pendingBlob && (
          <div style={{ marginTop: 6, fontSize: 9, color: '#007a5e', letterSpacing: '0.04em' }}>
            画像を選択済み（保存時にアップロードされます）
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
          jpg / png / webp 対応・長辺512px・1MB以内に自動圧縮
        </div>
      </div>

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

      {/* ひとこと */}
      <div>
        <label style={labelStyle}>ひとこと</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="プロフィールに表示されるコメントを入力..."
          maxLength={140}
          rows={3}
          style={{ ...inputStyle, height: 'auto', resize: 'vertical', padding: '8px 10px' }}
        />
        <div style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 4, textAlign: 'right' }}>
          {comment.length}/140
        </div>
      </div>

      {/* 保存ボタン */}
      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        style={{
          display: 'block', width: '100%', height: 42,
          border: '1px solid var(--mint)', borderRadius: 2,
          background: 'var(--ink)', color: 'var(--mint)',
          fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
          fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {loading ? (pendingBlob ? 'アップロード中...' : '保存中...') : '保存する'}
      </button>

      {result && (
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: result.startsWith('✓') ? '#007a5e' : '#b40a0a',
          textAlign: 'center', letterSpacing: '0.04em',
        }}>
          {result}
        </div>
      )}

      {saved && (
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
      )}
    </div>
  )
}

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  color: 'var(--ink-soft)', letterSpacing: '0.08em', marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: '100%', height: 36,
  border: '1px solid var(--hair-strong)', borderRadius: 2,
  padding: '0 10px', fontSize: 12,
  fontFamily: "'Noto Sans JP', sans-serif",
  color: 'var(--ink)', background: 'rgba(255,255,255,0.7)',
  outline: 'none', boxSizing: 'border-box',
}
