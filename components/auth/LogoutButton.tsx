'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        color: 'var(--ink-faint)',
        fontFamily: 'Orbitron, sans-serif',
        letterSpacing: '0.1em',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? '...' : '↩'}
    </button>
  )
}
