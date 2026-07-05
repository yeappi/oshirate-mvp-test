'use client'

import { useMemo, useState } from 'react'
import type { ItemType } from '@/lib/itemTypes'
import { getItemTypeLabel } from '@/lib/itemTypes'
import { adminStyles as s } from './adminStyles'

type UserOption = { id: string; name: string | null; email: string }
type Option = { id: string; label: string }
type AdminItem = { id: string; name: string; item_type: ItemType; is_active: boolean; created_at: string }

type Props = {
  users: UserOption[]
  initialItems: AdminItem[]
  illustrations: Option[]
  backgrounds: Option[]
  frames: Option[]
  tags: Option[]
}

export default function ItemManager({ users, initialItems, illustrations, backgrounds, frames, tags }: Props) {
  const [items, setItems] = useState(initialItems)
  const [itemType, setItemType] = useState<ItemType>('ILLUST_TICKET')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetId, setTargetId] = useState('')
  const [charismaValue, setCharismaValue] = useState('')
  const [distributeItemId, setDistributeItemId] = useState(initialItems[0]?.id ?? '')
  const [distributeMode, setDistributeMode] = useState<'one' | 'all'>('one')
  const [userId, setUserId] = useState(users[0]?.id ?? '')
  const [expiresAt, setExpiresAt] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const targetOptions = useMemo(() => {
    if (itemType === 'ILLUST_TICKET') return illustrations
    if (itemType === 'BACKGROUND_TICKET') return backgrounds
    if (itemType === 'FRAME_TICKET') return frames
    return tags
  }, [itemType, illustrations, backgrounds, frames, tags])

  const createItem = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_item', name, description, itemType, targetId, charismaValue }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? '作成に失敗しました')
      const item = json.item as AdminItem
      setItems((current) => [item, ...current])
      setDistributeItemId(item.id)
      setName('')
      setDescription('')
      setTargetId('')
      setCharismaValue('')
      setStatus('✓ アイテムを作成しました')
    } catch (error) {
      setStatus(`✗ ${error instanceof Error ? error.message : '作成に失敗しました'}`)
    } finally {
      setBusy(false)
    }
  }

  const distributeItem = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'distribute_item',
          itemId: distributeItemId,
          mode: distributeMode === 'all' ? 'all' : 'one',
          userId,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? '配布に失敗しました')
      setStatus(`✓ ${Number(json.count ?? 0).toLocaleString()}件 配布しました`)
    } catch (error) {
      setStatus(`✗ ${error instanceof Error ? error.message : '配布に失敗しました'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section style={s.section}>
        <div style={s.sectionTitle}>ITEM CREATE</div>
        <div style={{ marginTop: -4, marginBottom: 4, fontSize: 10, lineHeight: 1.7, color: 'var(--ink-soft)', fontWeight: 700 }}>
          限定イラスト券を作ると、対象イラストは自動で「特別イラスト / チケット限定」になります。
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={s.label}>種別</label>
            <select value={itemType} onChange={(e) => { setItemType(e.target.value as ItemType); setTargetId('') }} style={s.input}>
              <option value="ILLUST_TICKET">限定イラスト券</option>
              <option value="BACKGROUND_TICKET">背景引換券</option>
              <option value="FRAME_TICKET">枠引換券</option>
              <option value="TAG_TICKET">タグ引換券</option>
            </select>
          </div>
          <div>
            <label style={s.label}>アイテム名</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={s.input} placeholder="例: 初期ユーザー限定イラスト券" />
          </div>
          <div>
            <label style={s.label}>説明</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={s.textarea} placeholder="もちもの画面に出る説明" />
          </div>
          <div>
            <label style={s.label}>対象</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={s.input}>
              <option value="">選択してください</option>
              {targetOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <div style={{ marginTop: 5, fontSize: 9, lineHeight: 1.6, color: 'var(--ink-faint)', fontWeight: 700 }}>
              {itemType === 'ILLUST_TICKET'
                ? 'この対象イラストは保存時に金グロー表示・チケット限定購入へ自動設定されます。'
                : '背景 / 枠 / タグ券は自分の所持解放に使われます。'}
            </div>
          </div>
          {itemType === 'ILLUST_TICKET' && (
            <div>
              <label style={s.label}>魅力値加算（空欄ならイラスト価格）</label>
              <input type="number" min="0" value={charismaValue} onChange={(e) => setCharismaValue(e.target.value)} style={s.input} placeholder="例: 300" />
            </div>
          )}
          <button type="button" onClick={createItem} disabled={busy} style={s.primaryBtn}>{busy ? '処理中...' : 'アイテム作成'}</button>
        </div>
      </section>

      <section style={s.section}>
        <div style={s.sectionTitle}>ITEM DISTRIBUTE</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={s.label}>配布アイテム</label>
            <select value={distributeItemId} onChange={(e) => setDistributeItemId(e.target.value)} style={s.input}>
              <option value="">選択してください</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name} / {getItemTypeLabel(item.item_type)}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>配布先</label>
            <select value={distributeMode} onChange={(e) => setDistributeMode(e.target.value as 'one' | 'all')} style={s.input}>
              <option value="one">1人に配布</option>
              <option value="all">全員に配布</option>
            </select>
          </div>
          {distributeMode === 'one' && (
            <div>
              <label style={s.label}>ユーザー</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={s.input}>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name ?? '(名前なし)'} / {user.email}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={s.label}>期限（空欄 = 期限なし）</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={s.input} />
          </div>
          <button type="button" onClick={distributeItem} disabled={busy || !distributeItemId} style={s.primaryBtn}>{busy ? '処理中...' : '配布する'}</button>
        </div>
      </section>

      {status && <div style={{ fontSize: 11, fontWeight: 800, color: status.startsWith('✓') ? '#007a5e' : '#b40a0a' }}>{status}</div>}
    </div>
  )
}
