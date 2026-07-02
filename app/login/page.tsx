import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import LoginButton from '@/components/auth/LoginButton'

export default async function LoginPage() {
  const user = await getUser()
  if (user) redirect('/')

  return (
    <main className="app" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', textAlign: 'center', padding: '40px 24px' }}>
        <div className="logo" style={{ fontSize: '11px', marginBottom: '36px' }}>
          推されーと
        </div>

        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: '1px solid var(--ink)', margin: '0 auto 28px',
          display: 'grid', placeItems: 'center',
          fontFamily: 'Orbitron, sans-serif', fontSize: 28, color: 'var(--ink-faint)',
        }}>
          ✦
        </div>

        <p style={{
          fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)',
          letterSpacing: '0.06em', marginBottom: 28, lineHeight: 1.8,
        }}>
          推しを応援する、あなたの居場所。
        </p>

        <LoginButton />

        <p style={{ marginTop: 20, fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
          ログインすることで利用規約に同意したとみなします
        </p>
      </div>
    </main>
  )
}
