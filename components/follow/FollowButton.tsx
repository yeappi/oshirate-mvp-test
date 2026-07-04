'use client'

import { useState } from 'react'

type Props = {
  targetUserId: string
  initialFollowing: boolean
  compact?: boolean
}

export default function FollowButton({ targetUserId, initialFollowing, compact = false }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const toggleFollow = async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setMessage(json.error === 'cannot_follow_self' ? '自分はフォローできません' : '更新に失敗しました')
        return
      }
      setIsFollowing(Boolean(json.isFollowing))
      setMessage(json.isFollowing ? 'フォローしました' : 'フォロー解除しました')
    } catch {
      setMessage('更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 4, justifyItems: compact ? 'end' : 'stretch' }}>
      <button
        type="button"
        onClick={toggleFollow}
        disabled={loading}
        style={{
          border: '1px solid var(--hair-strong)',
          background: isFollowing ? 'rgba(10,24,28,0.9)' : 'rgba(111,255,224,0.45)',
          color: isFollowing ? 'var(--paper)' : 'var(--ink)',
          borderRadius: 999,
          padding: compact ? '6px 10px' : '10px 14px',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: compact ? 9 : 10,
          fontWeight: 900,
          letterSpacing: '0.08em',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}
      </button>
      {message && !compact && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-faint)' }}>{message}</div>
      )}
    </div>
  )
}
