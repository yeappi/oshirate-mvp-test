import Link from 'next/link'

const links = [
  { href: '/', label: '通常' },
  { href: '/admin', label: 'Admin' },
  { href: '/admin#announcement', label: '告知' },
  { href: '/notifications', label: '通知' },
  { href: '/login', label: 'Login' },
]

export default function QuickNav() {
  return (
    <nav
      aria-label="仮ナビゲーション"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        right: 8,
        zIndex: 9999,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 4,
        maxWidth: 220,
        pointerEvents: 'auto',
      }}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 28,
            padding: '0 9px',
            borderRadius: 999,
            border: '1px solid rgba(10, 24, 28, 0.18)',
            background: 'rgba(255, 255, 255, 0.88)',
            color: 'var(--ink)',
            textDecoration: 'none',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.04em',
            boxShadow: '0 6px 18px rgba(10, 24, 28, 0.12)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
