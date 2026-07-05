'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  unreadCount: number
}

export default function BottomNav({ unreadCount }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/',              label: 'ホーム', icon: '⌂', activeIcon: '⌂' },
    { href: '/discover',      label: '探す',   icon: '⌕', activeIcon: '◉' },
    { href: '/following',     label: 'フォロー', icon: '☆', activeIcon: '★' },
    { href: '/items',         label: 'もちもの', icon: '□', activeIcon: '■' },
    { href: '/notifications', label: '通知',   icon: '◇', activeIcon: '◆', badge: unreadCount },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-tab${isActive ? ' active' : ''}`}
          >
            <span className="bottom-tab-icon">{isActive ? tab.activeIcon : tab.icon}</span>
            <span className="bottom-tab-label">{tab.label}</span>

            {tab.badge != null && tab.badge > 0 && (
              <span className="bottom-tab-badge">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}

            {isActive && <span className="bottom-tab-dot" />}
          </Link>
        )
      })}
    </nav>
  )
}
