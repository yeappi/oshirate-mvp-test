import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getCharmRank } from '@/lib/rank'
import type { DecorationSlot } from '@/lib/decorationTypes'

// ============================================================
// POST /api/decoration
// body: { slot: DecorationSlot, decorationId: string | null }
//   decorationId = null → そのスロットの装飾を外す
// ============================================================
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { slot, decorationId } = body as {
    slot: DecorationSlot
    decorationId: string | null
  }

  // 装飾を外す
  if (!decorationId) {
    await supabase
      .from('user_profile_decorations')
      .delete()
      .eq('user_id', user.id)
      .eq('slot', slot)
    return NextResponse.json({ ok: true })
  }

  // ランク確認 — 素材の required_rank を超えているか
  const { data: profile } = await supabase
    .from('profiles')
    .select('charisma')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { rank } = getCharmRank(profile.charisma)

  const { data: decoration } = await supabase
    .from('profile_decorations')
    .select('required_rank, slot')
    .eq('id', decorationId)
    .eq('is_active', true)
    .single()

  if (!decoration) {
    return NextResponse.json({ error: 'Decoration not found' }, { status: 404 })
  }
  if (decoration.required_rank > rank) {
    return NextResponse.json({ error: 'Rank insufficient' }, { status: 403 })
  }
  if (decoration.slot !== slot) {
    return NextResponse.json({ error: 'Slot mismatch' }, { status: 400 })
  }

  // upsert（slot ごとに 1 行）
  const { error } = await supabase
    .from('user_profile_decorations')
    .upsert(
      { user_id: user.id, slot, decoration_id: decorationId },
      { onConflict: 'user_id,slot' }
    )

  if (error) {
    console.error('[decoration POST] upsert error:', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ============================================================
// GET /api/decoration
// 解放済み装飾一覧を返す（装飾選択UI用）
// ============================================================
export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('charisma')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { rank } = getCharmRank(profile.charisma)

  const { data: decorations } = await supabase
    .from('profile_decorations')
    .select('*')
    .eq('is_active', true)
    .lte('required_rank', rank)
    .order('required_rank', { ascending: true })

  return NextResponse.json({ decorations: decorations ?? [], rank })
}
