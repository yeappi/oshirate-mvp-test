import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { getUnreadCount } from '@/lib/notifications'
import { getItemTargetCandidates, getOwnedItems } from '@/lib/items'
import BottomNav from '@/components/layout/BottomNav'
import ItemsClient from '@/components/items/ItemsClient'

export default async function ItemsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const [items, candidates, unreadCount] = await Promise.all([
    getOwnedItems(user.id),
    getItemTargetCandidates(user.id),
    getUnreadCount(user.id),
  ])

  return (
    <>
      <main className="app" style={{ paddingBottom: 84 }}>
        <ItemsClient initialItems={items} candidates={candidates} />
      </main>
      <BottomNav unreadCount={unreadCount} />
    </>
  )
}
