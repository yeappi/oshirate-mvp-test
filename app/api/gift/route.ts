import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { rollGiftSlot } from '@/lib/gift'
import { notifyGiftClaimed } from '@/lib/notifications'

// ============================================================
// GET /api/gift
// ロジック:
//   1. 未受取(pending)のスロットがあれば返す
//   2. なければ前回のavailable_atを確認
//   3. 30分経過 or 履歴なし → 新規生成して返す
//   4. 30分未満 → 次に受取可能な時刻を返す
// ============================================================
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 未受取スロットを探す
  const { data: pending } = await supabase
    .from('gift_slots')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (pending) {
    return NextResponse.json({ state: 'pending', slot: pending })
  }

  // 直近の受取済みスロットを確認
  const { data: latest } = await supabase
    .from('gift_slots')
    .select('available_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const now = new Date()

  if (latest) {
    const availableAt = new Date(latest.available_at)
    if (now < availableAt) {
      // まだ時間が来ていない
      return NextResponse.json({
        state: 'waiting',
        availableAt: availableAt.toISOString(),
      })
    }
  }

  // 新規生成
  const roll = rollGiftSlot()
  const availableAt = new Date(now.getTime() + 30 * 60 * 1000) // 30分後

  const { data: newSlot, error } = await supabase
    .from('gift_slots')
    .insert({
      user_id: user.id,
      table_type: roll.tableType,
      options: roll.options,
      status: 'pending',
      available_at: availableAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[gift GET] insert error:', error)
    return NextResponse.json({ error: 'Failed to create gift' }, { status: 500 })
  }

  return NextResponse.json({ state: 'pending', slot: newSlot })
}

// ============================================================
// POST /api/gift
// body: { slotId: string, selectedIndex: 0|1|2 }
// ロジック:
//   1. スロットが自分のものか確認
//   2. pending 状態か確認
//   3. 選択インデックスが有効か確認
//   4. claimed に更新 + profiles.points を加算
// ============================================================
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { slotId, selectedIndex } = body as { slotId: string; selectedIndex: number }

  if (
    typeof slotId !== 'string' ||
    typeof selectedIndex !== 'number' ||
    ![0, 1, 2].includes(selectedIndex)
  ) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  // スロット取得（自分のものか確認）
  const { data: slot, error: fetchError } = await supabase
    .from('gift_slots')
    .select('*')
    .eq('id', slotId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchError || !slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  const selectedPoint = slot.options[selectedIndex] as number

  // トランザクション的に更新（Supabaseは本来RPC推奨だがMVPはこれで十分）
  const { error: updateError } = await supabase
    .from('gift_slots')
    .update({
      selected_index: selectedIndex,
      selected_point: selectedPoint,
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    })
    .eq('id', slotId)

  if (updateError) {
    console.error('[gift POST] update error:', updateError)
    return NextResponse.json({ error: 'Failed to claim' }, { status: 500 })
  }

  // points 加算
  const { error: pointError } = await supabase.rpc('increment_points', {
    p_user_id: user.id,
    p_delta: selectedPoint,
  })

  if (pointError) {
    console.error('[gift POST] point increment error:', pointError)
  }

  // 通知生成（失敗してもギフト受取は成立）
  await notifyGiftClaimed(user.id, selectedPoint, slot.table_type).catch(
    (e) => console.error('[gift POST] notify error:', e)
  )

  return NextResponse.json({
    success: true,
    selectedPoint,
    allOptions: slot.options,
    tableType: slot.table_type,
  })
}
