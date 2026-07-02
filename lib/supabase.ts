import { createBrowserClient } from '@supabase/ssr'

// Client Components 用（ブラウザで動く）
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
