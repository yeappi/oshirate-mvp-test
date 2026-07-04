import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type Body = {
  targetUserId?: unknown
  action?: unknown
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const body = (await request.json()) as Body
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : ''
  const action = body.action === 'unfollow' ? 'unfollow' : 'follow'

  if (!targetUserId) {
    return NextResponse.json({ ok: false, error: 'invalid_target' }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ ok: false, error: 'cannot_follow_self' }, { status: 400 })
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!target) {
    return NextResponse.json({ ok: false, error: 'target_not_found' }, { status: 404 })
  }

  if (action === 'unfollow') {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', targetUserId)

    if (error) {
      console.error('[follows UNFOLLOW]', error)
      return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, isFollowing: false })
  }

  const { error } = await supabase
    .from('user_follows')
    .upsert(
      { follower_id: user.id, followed_id: targetUserId },
      { onConflict: 'follower_id,followed_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[follows FOLLOW]', error)
    return NextResponse.json({ ok: false, error: 'unknown' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, isFollowing: true })
}
