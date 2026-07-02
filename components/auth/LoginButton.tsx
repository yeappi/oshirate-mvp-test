'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export default function LoginButton() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const supabase = createSupabaseClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    // リダイレクト後なのでここには戻らない
  }

  return (
    <button
      className="cta"
      onClick={handleLogin}
      disabled={loading}
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {loading ? 'LOADING...' : 'GOOGLE でログイン'}
    </button>
  )
}
