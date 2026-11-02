import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreatePostForm from './create-post-form'

const POSTING_RULES = [
  'Remember the human',
  'Behave like you would in real life',
  'Look for the original source of content',
  'Search for duplicates before posting',
  "Read the community's rules",
]

export default async function CreatePostPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims.sub
  if (!userId) {
    redirect('/login')
  }

  const { data: memberships, error } = await supabase
    .from('community_members')
    .select('communities(id, name)')
    .eq('user_id', userId)

  if (error) {
    throw new Error('Could not load your communities.')
  }

  const communities = memberships
    .map((membership) => membership.communities)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <main className="flex-1 bg-[#07080b] px-4 py-8 text-zinc-100">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Create post
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Create post
          </h1>

          {communities.length > 0 ? (
            <CreatePostForm userId={userId} communities={communities} />
          ) : (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-300">
              Join a community first, then come back to post in it.
            </div>
          )}
        </div>

        <aside className="self-start rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 lg:mt-16">
          <h2 className="text-sm font-semibold text-white">
            Posting to a community
          </h2>
          <ul className="mt-2 divide-y divide-zinc-800 text-sm text-zinc-300">
            {POSTING_RULES.map((rule) => (
              <li key={rule} className="py-2.5">
                {rule}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  )
}
