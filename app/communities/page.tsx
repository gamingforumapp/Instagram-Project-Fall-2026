import type { Metadata } from 'next'
import { CommunityCard } from '@/components/community-card'
import { SiteHeader } from '@/components/site-header'
import { getCommunities, getViewer } from '@/lib/communities/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Communities | Faction',
}

export default async function CommunitiesPage() {
  const [viewer, result] = await Promise.all([getViewer(), getCommunities()])

  return (
    <div className="min-h-screen bg-[#07090b] text-[#f4f1eb]">
      <SiteHeader active="communities" viewer={viewer} />

      <main className="mx-auto max-w-6xl px-5 py-9">
        <p className="mb-2 text-xs font-semibold tracking-wider text-[#e9b74e]">
          FIND YOUR GAME
        </p>
        <h1 className="text-4xl font-semibold">Communities</h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">
          Browse every community on Faction. Open one to see its posts
          {viewer ? ', and join it to post there.' : '.'}
        </p>

        {!result.ok ? (
          <p className="mt-8 rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
            Communities could not be loaded right now. Please refresh the page.
          </p>
        ) : result.communities.length === 0 ? (
          <p className="mt-8 rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
            No communities available yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
