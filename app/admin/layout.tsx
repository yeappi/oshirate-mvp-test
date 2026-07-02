import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile?.is_admin) redirect('/')

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 管理画面ヘッダー */}
      <header style={{
        background: 'var(--ink)',
        color: 'var(--mint)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.3em',
        }}>
          ADMIN
        </div>
        <Link href="/" style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--ink-faint)',
          letterSpacing: '0.1em',
          textDecoration: 'none',
        }}>
          ← サイトへ戻る
        </Link>
      </header>

      {/* サブナビ */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 16px',
        display: 'flex',
        gap: 0,
        overflowX: 'auto',
      }}>
        {[
          { href: '/admin',              label: 'ユーザー一覧' },
          { href: '/admin/announcement', label: '告知' },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: 'block',
            padding: '12px 16px',
            fontSize: 12,
            fontWeight: 700,
            color: '#374151',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            borderBottom: '2px solid transparent',
          }}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}
