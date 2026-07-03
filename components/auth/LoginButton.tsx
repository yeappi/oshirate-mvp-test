'use client'

import { useState } from 'react'

export default function LoginButton() {
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    window.location.assign('/auth/login')
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
