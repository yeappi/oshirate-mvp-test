'use client'

import { useEffect } from 'react'
import type { NotificationRow, NotificationType } from '@/lib/notifications'

type Props = {
  notifications: NotificationRow[]
}

// タイプ別アイコン + ラベル
const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  gift_claimed:             { icon: '✦', color: 'var(--mint)' },
  illustration_purchased:   { icon: '◈', color: 'var(--ink-soft)' },
  rank_up:                  { icon: '▲', color: '#b48000' },
  decoration_unlocked:      { icon: '◇', color: 'var(--ink-soft)' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMin / 60)
  const diffD   = Math.floor(diffH / 24)

  if (diffMin < 1)  return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  if (diffH < 24)   return `${diffH}時間前`
  if (diffD < 7)    return `${diffD}日前`

  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

export default function NotificationList({ notifications }: Props) {
  // マウント時に未読を一括既読
  useEffect(() => {
    const hasUnread = notifications.some((n) => !n.is_read)
    if (!hasUnread) return

    fetch('/api/notifications/read', { method: 'POST' }).catch(
      (e) => console.error('[NotificationList] mark read error:', e)
    )
  }, [notifications])

  if (notifications.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 0',
        fontFamily: 'Orbitron, sans-serif',
        fontSize: 10,
        color: 'var(--ink-faint)',
        letterSpacing: '0.2em',
      }}>
        通知はありません
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
    </div>
  )
}

function NotificationItem({ notification: n }: { notification: NotificationRow }) {
  const config = TYPE_CONFIG[n.type] ?? { icon: '·', color: 'var(--ink-faint)' }

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '14px 0',
      borderBottom: '1px solid var(--hair)',
      opacity: n.is_read ? 0.6 : 1,
    }}>
      {/* 未読インジケーター */}
      <div style={{
        width: 3,
        alignSelf: 'stretch',
        background: n.is_read ? 'transparent' : 'var(--mint)',
        borderRadius: 1,
        flexShrink: 0,
        boxShadow: n.is_read ? 'none' : '0 0 4px rgba(111,255,224,0.6)',
      }} />

      {/* タイプアイコン */}
      <div style={{
        width: 28,
        height: 28,
        border: '1px solid var(--hair-strong)',
        borderRadius: 1,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize: 12,
        color: config.color,
      }}>
        {config.icon}
      </div>

      {/* 本文 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '0.02em',
          lineHeight: 1.5,
          marginBottom: n.body ? 4 : 0,
        }}>
          {n.title}
        </div>
        {n.body && (
          <div style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--ink-soft)',
            letterSpacing: '0.02em',
          }}>
            {n.body}
          </div>
        )}
        <div style={{
          marginTop: 5,
          fontSize: 9,
          color: 'var(--ink-faint)',
          fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '0.06em',
        }}>
          {formatDate(n.created_at)}
        </div>
      </div>
    </div>
  )
}
