import { createSupabaseServerClient } from '@/lib/supabase-server'
import { adminStyles as s } from '@/components/admin/adminStyles'
import PointAdjustForm from '@/components/admin/PointAdjustForm'
import AnnouncementForm from '@/components/admin/AnnouncementForm'
import IllustrationManager from '@/components/admin/IllustrationManager'
import ItemManager from '@/components/admin/ItemManager'

// 管理者チェックは app/admin/layout.tsx が担当
export default async function AdminPage() {
  const supabase = createSupabaseServerClient()

  const { data: usersRaw } = await supabase.rpc('admin_get_users')
  const users = (usersRaw ?? []) as Array<{
    id: string; name: string | null; email: string
    points: number; charisma: number; is_admin: boolean
    created_at: string
  }>

  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: illustrationsRaw } = await supabase
    .from('illustrations')
    .select('id, title, description, price, image_url, max_per_user, reward_tag_id, is_special, requires_item_ticket, special_label, is_active, sort_order')
    .order('sort_order', { ascending: true })

  const illustrations = (illustrationsRaw ?? []) as Array<{
    id: string
    title: string
    description: string | null
    price: number
    image_url: string | null
    max_per_user: number | null
    reward_tag_id: string | null
    is_special: boolean
    requires_item_ticket: boolean
    special_label: string | null
    is_active: boolean
    sort_order: number
  }>

  const { data: rewardTagsRaw } = await supabase
    .from('profile_tags')
    .select('id, label')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const rewardTags = (rewardTagsRaw ?? []) as Array<{ id: string; label: string }>


  const { data: backgroundsRaw } = await supabase
    .from('profile_backgrounds')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: framesRaw } = await supabase
    .from('avatar_frames')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: itemRowsRaw } = await supabase
    .from('items')
    .select('id, name, item_type, is_active, created_at')
    .order('created_at', { ascending: false })

  const itemRows = (itemRowsRaw ?? []) as Array<{
    id: string
    name: string
    item_type: 'ILLUST_TICKET' | 'BACKGROUND_TICKET' | 'FRAME_TICKET' | 'TAG_TICKET'
    is_active: boolean
    created_at: string
  }>

  const backgroundOptions = (backgroundsRaw ?? []).map((b: any) => ({ id: String(b.id), label: String(b.name) }))
  const frameOptions = (framesRaw ?? []).map((f: any) => ({ id: String(f.id), label: String(f.name) }))
  const illustrationOptions = illustrations.map((i) => ({ id: i.id, label: `${i.title} / ${Number(i.price).toLocaleString()}pt` }))
  const tagOptions = rewardTags.map((t) => ({ id: t.id, label: t.label }))

  return (
    <div>
      {/* ===== 1. ユーザー一覧 ===== */}
      <section style={{ ...s.section, marginBottom: 16 }}>
        <div style={s.sectionTitle}>USER LIST — {users.length}名</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>名前 / メール</th>
                <th style={{ ...s.th, textAlign: 'right' }}>pt</th>
                <th style={{ ...s.th, textAlign: 'right' }}>魅力度</th>
                <th style={s.th}>権限</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
                      {u.name ?? '(名前なし)'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{u.email}</div>
                    <div style={{ fontSize: 8, color: 'var(--ink-faint)', marginTop: 2,
                      fontFamily: 'Orbitron, sans-serif' }}>
                      {new Date(u.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right',
                    fontFamily: 'Orbitron, sans-serif', fontSize: 12 }}>
                    {Number(u.points).toLocaleString()}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right',
                    fontFamily: 'Orbitron, sans-serif', fontSize: 11,
                    color: 'var(--ink-soft)' }}>
                    {Number(u.charisma).toLocaleString()}
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(u.is_admin ? 'admin' : 'normal')}>
                      {u.is_admin ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 9, color: 'var(--ink-faint)',
          fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em' }}>
          管理者設定 → Supabase SQL Editor:{' '}
          <code>update public.profiles set is_admin=true where id='...uuid...';</code>
        </div>
      </section>

      {/* ===== 2. ポイント付与 / 修正 ===== */}
      <section style={{ ...s.section, marginBottom: 16 }}>
        <div style={s.sectionTitle}>POINT ADJUST</div>
        <PointAdjustForm
          users={users.map((u) => ({
            id: u.id, name: u.name, email: u.email, points: Number(u.points),
          }))}
        />
      </section>


      {/* ===== 3. イラスト管理 ===== */}
      <section id="illustrations" style={{ marginBottom: 16 }}>
        <IllustrationManager initialIllustrations={illustrations} rewardTags={rewardTags} />
      </section>


      {/* ===== 4. アイテム管理 ===== */}
      <section id="items" style={{ marginBottom: 16 }}>
        <ItemManager
          users={users.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
          initialItems={itemRows}
          illustrations={illustrationOptions}
          backgrounds={backgroundOptions}
          frames={frameOptions}
          tags={tagOptions}
        />
      </section>

      {/* ===== 5. 告知変更 ===== */}
      <section id="announcement" style={s.section}>
        <div style={s.sectionTitle}>ANNOUNCEMENT</div>
        <AnnouncementForm
          initial={announcement ? {
            id: announcement.id,
            title: announcement.title ?? '',
            content: announcement.content,
            is_active: announcement.is_active,
          } : null}
        />
      </section>
    </div>
  )
}
