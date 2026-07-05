'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { adminStyles as s } from '@/components/admin/adminStyles'

type AdminIllustration = {
  id: string
  title: string
  description: string | null
  price: number
  image_url: string | null
  max_per_user: number | null
  reward_tag_id: string | null
  is_special: boolean
  requires_item_ticket: boolean
  special_label: string | null
  is_active: boolean
  sort_order: number
}

type RewardTagOption = {
  id: string
  label: string
}

type FormState = {
  id: string | null
  title: string
  description: string
  price: string
  max_per_user: string
  sort_order: string
  is_active: boolean
  is_special: boolean
  requires_item_ticket: boolean
  special_label: string
  reward_tag_id: string
  image_url: string
}

type Props = {
  initialIllustrations: AdminIllustration[]
  rewardTags: RewardTagOption[]
}

const emptyForm: FormState = {
  id: null,
  title: '',
  description: '',
  price: '100',
  max_per_user: '',
  sort_order: '0',
  is_active: true,
  is_special: false,
  requires_item_ticket: false,
  special_label: '',
  reward_tag_id: '',
  image_url: '',
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_SIDE = 1200
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

async function drawAndCompress(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number
): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const tw = Math.max(1, Math.round(width * scale))
  const th = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像処理を開始できませんでした')

  ctx.drawImage(source as CanvasImageSource, 0, 0, tw, th)

  const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg'

  const toBlob = (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('画像の圧縮に失敗しました'))),
        mimeType,
        quality
      )
    })

  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await toBlob(q)
    if (blob.size <= MAX_BYTES) return blob
  }

  throw new Error('画像を圧縮しても2MBを超えています。少し小さい画像を選んでください')
}

async function compressIllustrationImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('jpg / png / webp のみ対応しています')
  }

  try {
    const bitmap = await createImageBitmap(file)
    try {
      return await drawAndCompress(bitmap, bitmap.width, bitmap.height)
    } finally {
      bitmap.close()
    }
  } catch {
    // SafariなどでcreateImageBitmapが失敗した時のfallback
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      el.src = objectUrl
    })
    return await drawAndCompress(img, img.naturalWidth, img.naturalHeight)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function IllustrationManager({ initialIllustrations, rewardTags }: Props) {
  const [items, setItems] = useState(initialIllustrations)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [pendingExt, setPendingExt] = useState('webp')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [imageStatus, setImageStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const setNewObjectUrl = (url: string) => {
    revokeObjectUrl()
    objectUrlRef.current = url
    setPreviewUrl(url)
  }

  const resetForm = () => {
    revokeObjectUrl()
    setForm(emptyForm)
    setPendingBlob(null)
    setPendingExt('webp')
    setPreviewUrl(null)
    setImageStatus(null)
    setStatus(null)
  }

  const startEdit = (item: AdminIllustration) => {
    revokeObjectUrl()
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      price: String(item.price),
      max_per_user: item.max_per_user === null ? '' : String(item.max_per_user),
      sort_order: String(item.sort_order),
      is_active: item.is_active,
      is_special: Boolean(item.is_special),
      requires_item_ticket: Boolean(item.requires_item_ticket),
      special_label: item.special_label ?? '',
      reward_tag_id: item.reward_tag_id ?? '',
      image_url: item.image_url ?? '',
    })
    setPendingBlob(null)
    setPendingExt('webp')
    setPreviewUrl(item.image_url)
    setImageStatus(null)
    setStatus(null)
  }

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageStatus('圧縮中...')
    setStatus(null)

    try {
      const blob = await compressIllustrationImage(file)
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      setPendingBlob(blob)
      setPendingExt(ext)
      setNewObjectUrl(URL.createObjectURL(blob))
      setImageStatus(`画像を選択済み（${Math.round(blob.size / 1024)}KB / 保存時にアップロード）`)
    } catch (error) {
      setPendingBlob(null)
      setImageStatus(error instanceof Error ? error.message : '画像の処理に失敗しました')
    }

    event.target.value = ''
  }

  const uploadPendingImage = async (): Promise<string | null> => {
    if (!pendingBlob) return form.image_url || null

    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('ログインが必要です')

    const safeTitle = (form.title || 'illustration')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'illustration'
    const path = `${user.id}/illustration-${Date.now()}-${safeTitle}.${pendingExt}`

    const { error } = await supabase.storage
      .from('illustrations')
      .upload(path, pendingBlob, { contentType: pendingBlob.type, upsert: false })

    if (error) throw new Error(`画像アップロード失敗: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('illustrations')
      .getPublicUrl(path)

    return publicUrl
  }

  const saveIllustration = async () => {
    setSaving(true)
    setStatus(null)

    try {
      const imageUrl = await uploadPendingImage()
      const payload = {
        id: form.id,
        title: form.title,
        description: form.description,
        price: form.price,
        max_per_user: form.max_per_user,
        sort_order: form.sort_order,
        is_active: form.is_active,
        is_special: form.is_special,
        requires_item_ticket: form.requires_item_ticket,
        special_label: form.special_label,
        reward_tag_id: form.reward_tag_id || null,
        image_url: imageUrl,
      }

      const res = await fetch('/api/admin/illustrations', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? '保存に失敗しました')

      const saved = json.illustration as AdminIllustration
      setItems((current) => {
        const exists = current.some((item) => item.id === saved.id)
        const next = exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
        return next.sort((a, b) => a.sort_order - b.sort_order)
      })
      setStatus('✓ 保存しました')
      setForm({
        id: saved.id,
        title: saved.title,
        description: saved.description ?? '',
        price: String(saved.price),
        max_per_user: saved.max_per_user === null ? '' : String(saved.max_per_user),
        sort_order: String(saved.sort_order),
        is_active: saved.is_active,
        is_special: Boolean(saved.is_special),
        requires_item_ticket: Boolean(saved.requires_item_ticket),
        special_label: saved.special_label ?? '',
        reward_tag_id: saved.reward_tag_id ?? '',
        image_url: saved.image_url ?? '',
      })
      setPendingBlob(null)
      revokeObjectUrl()
      setPreviewUrl(saved.image_url)
      setImageStatus(null)
    } catch (error) {
      setStatus(`✗ ${error instanceof Error ? error.message : '保存に失敗しました'}`)
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || imageStatus === '圧縮中...'
  const isEditing = Boolean(form.id)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={s.section}>
        <div style={s.sectionTitle}>{isEditing ? 'EDIT ILLUSTRATION' : 'ADD ILLUSTRATION'}</div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={s.label}>イラスト画像</label>
            <div style={previewBoxStyle}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="イラストプレビュー" style={previewImgStyle} />
              ) : (
                <div style={{ color: 'var(--ink-faint)', fontSize: 11, fontWeight: 700 }}>
                  画像未設定
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
              style={{ ...s.ghostBtn, width: '100%', marginTop: 8 }}
            >
              画像を選ぶ
            </button>
            <div style={{ marginTop: 5, fontSize: 9, color: 'var(--ink-faint)' }}>
              jpg / png / webp 対応・長辺1200px・2MB以内に自動圧縮。URL入力はありません。
            </div>
            {imageStatus && (
              <div style={{ marginTop: 6, fontSize: 10, color: imageStatus.startsWith('画像を選択') ? '#007a5e' : '#b40a0a', fontWeight: 700 }}>
                {imageStatus}
              </div>
            )}
          </div>

          <div>
            <label style={s.label}>タイトル</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              style={s.input}
              maxLength={60}
              placeholder="例: 夏の推されーと"
            />
          </div>

          <div>
            <label style={s.label}>説明</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              style={s.textarea}
              maxLength={240}
              placeholder="イラストの説明を入力..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={s.label}>必要pt</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => updateForm('price', e.target.value)}
                style={s.input}
              />
            </div>
            <div>
              <label style={s.label}>同価格内の順番</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => updateForm('sort_order', e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={s.label}>購入上限</label>
              <input
                type="number"
                min="1"
                value={form.max_per_user}
                onChange={(e) => updateForm('max_per_user', e.target.value)}
                style={s.input}
                placeholder="空欄 = 無制限"
              />
            </div>
            <div>
              <label style={s.label}>特典タグ</label>
              <select
                value={form.reward_tag_id}
                onChange={(e) => updateForm('reward_tag_id', e.target.value)}
                style={s.input}
              >
                <option value="">なし</option>
                {rewardTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 12, background: 'rgba(255,255,255,0.72)', display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--ink)' }}>限定設定</div>
              <div style={{ marginTop: 4, fontSize: 9, lineHeight: 1.6, color: 'var(--ink-faint)', fontWeight: 700 }}>
                特別イラストは一覧上部に金グローで表示。チケット限定にすると通常pt購入はできません。
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
                <input
                  type="checkbox"
                  checked={form.is_special}
                  onChange={(e) => updateForm('is_special', e.target.checked)}
                />
                特別イラスト（金グロー）
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
                <input
                  type="checkbox"
                  checked={form.requires_item_ticket}
                  onChange={(e) => {
                    const checked = e.target.checked
                    updateForm('requires_item_ticket', checked)
                    if (checked) updateForm('is_special', true)
                  }}
                />
                チケット限定
              </label>
            </div>

            <div>
              <label style={s.label}>特別ラベル</label>
              <input
                type="text"
                value={form.special_label}
                onChange={(e) => updateForm('special_label', e.target.value)}
                style={s.input}
                maxLength={24}
                placeholder="例: 初期限定"
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateForm('is_active', e.target.checked)}
            />
            表示中
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <button type="button" onClick={saveIllustration} disabled={busy} style={s.primaryBtn}>
              {saving ? '保存中...' : isEditing ? '更新する' : '追加する'}
            </button>
            <button type="button" onClick={resetForm} disabled={busy} style={s.ghostBtn}>
              新規
            </button>
          </div>

          {status && (
            <div style={{ fontSize: 11, fontWeight: 700, color: status.startsWith('✓') ? '#007a5e' : '#b40a0a' }}>
              {status}
            </div>
          )}
        </div>
      </section>

      <section style={s.section}>
        <div style={s.sectionTitle}>ILLUSTRATION LIST — {items.length}件</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => startEdit(item)}
              style={listItemStyle}
            >
              <div style={thumbStyle}>
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" style={thumbImgStyle} />
                ) : (
                  <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>NO IMG</span>
                )}
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--ink)' }}>{item.title}</div>
                <div style={{ marginTop: 2, fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'Orbitron, sans-serif' }}>
                  {item.price.toLocaleString()}pt / same price order {item.sort_order} / {item.is_special ? 'SPECIAL / ' : ''}{item.requires_item_ticket ? 'TICKET / ' : ''}{item.is_active ? '表示中' : '非表示'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)' }}>
                編集
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

const previewBoxStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '4 / 3',
  border: '1px solid var(--hair-strong)',
  borderRadius: 3,
  background: 'rgba(255,255,255,0.55)',
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
}

const previewImgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

const listItemStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  border: '1px solid var(--hair)',
  background: 'rgba(255,255,255,0.5)',
  borderRadius: 3,
  padding: 8,
  cursor: 'pointer',
}

const thumbStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 3,
  background: 'rgba(7,17,14,0.05)',
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  flexShrink: 0,
}

const thumbImgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}
