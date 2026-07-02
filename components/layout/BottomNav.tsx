'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  unreadCount: number
}

export default function BottomNav({ unreadCount }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/',              label: 'ホーム',  icon: '⌂' },
    { href: '/notifications', label: '通知',    icon: '◈', badge: unreadCount },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(100%, 420px)',
      borderTop: '1px solid var(--hair-strong)',
      background: 'rgba(251,255,253,0.96)',
      backdropFilter: 'blur(8px)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      zIndex: 50,
    }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '10px 0 14px',
              textDecoration: 'none',
              color: isActive ? 'var(--ink)' : 'var(--ink-faint)',
              position: 'relative',
            }}
          >
            {/* アイコン */}
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>

            {/* ラベル */}
            <span style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}>
              {tab.label}
            </span>

            {/* 未読バッジ */}
            {tab.badge != null && tab.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: 'calc(50% - 14px)',
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                background: 'var(--mint)',
                color: 'var(--ink)',
                fontSize: 8,
                fontWeight: 900,
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'Orbitron, sans-serif',
                lineHeight: 1,
                padding: '0 3px',
                boxShadow: '0 0 5px rgba(111,255,224,0.7)',
              }}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}

            {/* アクティブインジケーター */}
            {isActive && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 20,
                height: 1,
                background: 'var(--ink)',
              }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
