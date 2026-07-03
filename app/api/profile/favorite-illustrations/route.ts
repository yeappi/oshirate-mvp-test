import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const MAX_FAVORITES = 3

type Body = {
  illustrationId?: unknown
}

async function renumberFavorites(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
) {
  const { data } = await supabase
    .from('user_favorite_illustrations')
    .select('id')
    .eq('user_id', userId)
    .order('favorite_order', { ascending: true })
    .order('created_at', { ascending: true })

  const rows = (data ?? []) as Array<{ id: string }>
  await Promise.all(
    rows.map((row, index) =>
      supabase
        .from('user_favorite_illustrations')
        .update({ favorite_order: index + 1 })
        .eq('id', row.id)
        .eq('user_id', userId)
    )
  )
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const body = (await request.json()) as Body
  const illustrationId = typeof body.illustrationId === 'string' ? body.illustrationId : ''
  if (!illustrationId) {
    return NextResponse.json({ ok: false, error: 'invalid_illustration' }, { status: 400 })
  }

  // 購入済みイラストだけお気に入りにできる
  const { data: owned } = await supabase
    .from('user_illustrations')
    .select('illustration_id')
    .eq('user_id', user.id)
    .eq('illustration_id', illustrationId)
    .maybeSingle()

  if (!owned) {
    return NextResponse.json({ ok: false, error: 'not_owned' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('user_favorite_illustrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('illustration_id', illustrationId)
    .maybeSingle()

  // すでにお気に入りなら解除
  if (existing) {
    const { error } = await supabase
      .from('user_favorite_illustrations')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[favorite illustrations DELETE]', error)
      return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
    }

    await renumberFavorites(supabase, user.id)
    return NextResponse.json({ ok: true, isFavorite: false })
  }

  const { data: currentFavorites } = await supabase
    .from('user_favorite_illustrations')
    .select('id')
    .eq('user_id', user.id)

  const currentCount = currentFavorites?.length ?? 0
  if (currentCount >= MAX_FAVORITES) {
    return NextResponse.json({ ok: false, error: 'favorite_limit_reached' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_favorite_illustrations')
    .insert({
      user_id: user.id,
      illustration_id: illustrationId,
      favorite_order: currentCount + 1,
    })

  if (error) {
    console.error('[favorite illustrations INSERT]', error)
    return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, isFavorite: true })
}
