import { createSupabaseServerClient } from '@/lib/supabase-server'
import { adminStyles as s } from '@/components/admin/adminStyles'
import PointAdjustForm from '@/components/admin/PointAdjustForm'
import AnnouncementForm from '@/components/admin/AnnouncementForm'

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

      {/* ===== 3. 告知変更 ===== */}
      <section style={s.section}>
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
