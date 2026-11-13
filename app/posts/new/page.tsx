import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getViewer } from '@/lib/communities/queries'
import { createClient } from '@/lib/supabase/server'
import CreatePostForm from './create-post-form'

const POSTING_RULES = [
  'Behave like you would in real life',
  'Look for the original source of content',
  'Search for duplicates before posting',
  "Read the community's rules",
]

export default async function CreatePostPage() {
  // getViewer checks the session with getClaims.
  const viewer = await getViewer()
  if (!viewer) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: memberships, error } = await supabase
    .from('community_members')
    .select('communities(id, name)')
    .eq('user_id', viewer.userId)

  if (error) {
    throw new Error('Could not load your communities.')
  }

  const communities = memberships
    .map((membership) => membership.communities)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen bg-[#07090b] text-[#f4f1eb]">
      <SiteHeader viewer={viewer} />

      <main className="mx-auto max-w-6xl px-5 py-9">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-[#e9b74e]">
              SHARE WITH YOUR FACTION
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create post
            </h1>

            {communities.length > 0 ? (
              <CreatePostForm userId={viewer.userId} communities={communities} />
            ) : (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#292d34] bg-[#101319] p-5">
                <div>
                  <h2 className="text-sm font-semibold">
                    You haven&apos;t joined a community yet
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Join one first, then come back to post in it.
                  </p>
                </div>
                <Link
                  href="/communities"
                  className="rounded-lg bg-[#e9b74e] px-3 py-2 text-sm font-semibold text-black"
                >
                  Browse communities
                </Link>
              </div>
            )}
          </div>

          <aside className="self-start rounded-xl border border-[#e9b74e] bg-[#17140f] p-5 lg:mt-[4.5rem]">
            <h2 className="text-sm font-semibold text-[#e9c980]">
              ◎ Posting Rules
            </h2>
            <ul className="mt-2 divide-y divide-[#2e261a] text-sm text-zinc-400">
              {POSTING_RULES.map((rule) => (
                <li key={rule} className="py-2.5">
                  {rule}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>

      <SiteFooter viewer={viewer} />
    </div>
  )
}
