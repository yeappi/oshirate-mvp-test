import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { getUserOwnedTags } from '@/lib/tags'
import TagSelectForm from '@/components/profile/tags/TagSelectForm'

export default async function ProfileTagsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const tags = await getUserOwnedTags(user.id)

  return (
    <main className="app">
      <div className="card">
        <header className="nav">
          <Link href="/profile/edit" style={{ fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'none' }}>
            ←
          </Link>
          <div className="logo">タグ選択</div>
          <div style={{ width: 20 }} />
        </header>

        <div style={{ marginTop: 20 }}>
          <p style={{
            margin: '0 0 14px',
            fontSize: 11,
            lineHeight: 1.7,
            color: 'var(--ink-soft)',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}>
            所持タグからプロフィールに貼るタグを最大3個まで選べます。
          </p>
          <TagSelectForm tags={tags} />
        </div>
      </div>
    </main>
  )
}
