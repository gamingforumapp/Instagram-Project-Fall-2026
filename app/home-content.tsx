'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import Crest from '@/components/crest'
import PostCard, { type FeedPost } from '@/components/post-card'
import type { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/client'

type Community = Pick<Tables<'communities'>, 'id' | 'name' | 'description'>

export type HomePost = FeedPost & {
  authorUsername: string | null
}

export type HomeViewer = { displayName: string }

type Props = {
  communities: Community[]
  posts: HomePost[]
  dataState: 'ready' | 'error' | 'unconfigured'
  viewer: HomeViewer | null
}

export default function HomeContent({
  communities,
  posts,
  dataState,
  viewer,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'popular'>('newest')
  const [showGate, setShowGate] = useState(false)

  async function handleLogout() {
    const { error } = await createClient().auth.signOut()
    if (error) {
      alert('Unable to sign out. Please try again.')
      return
    }
    router.push('/')
    router.refresh()
  }

  const query = search.toLowerCase()
  const filteredCommunities = useMemo(
    () =>
      communities.filter((c) =>
        `${c.name} ${c.description ?? ''}`.toLowerCase().includes(query)
      ),
    [communities, query]
  )
  const filteredPosts = useMemo(
    () =>
      posts
        .filter((p) => `${p.title} ${p.content}`.toLowerCase().includes(query))
        .sort((a, b) =>
          sort === 'popular'
            ? b.upvote_count - a.upvote_count
            : Date.parse(b.created_at) - Date.parse(a.created_at)
        ),
    [posts, query, sort]
  )

  return (
    <div className="min-h-screen bg-[#07090b] text-[#f4f1eb]">
      <header className="border-b border-[#1e2228] bg-[#090b0e]">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold tracking-wide text-[#e8c36b]"
          >
            <Crest size={32} />
            FACTION
          </Link>
          <label className="min-w-48 flex-1 sm:max-w-sm">
            <span className="sr-only">Search public content</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities and posts..."
              className="w-full rounded-lg border border-[#282c34] bg-[#11151b] px-4 py-2 text-sm outline-none focus:border-[#e9b74e]"
            />
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-3 whitespace-nowrap text-sm">
            <Link href="/" className="text-[#e9b74e]">
              ⌂ Home
            </Link>
            <a href="#communities" className="text-zinc-400 hover:text-white">
              Communities
            </a>

            {viewer ? (
              <>
                <Link
                  href="/profile"
                  className="max-w-40 truncate rounded-lg border border-[#30343b] px-3 py-2 hover:bg-[#171b22]"
                >
                  {viewer.displayName}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-[#30343b] px-3 py-2 hover:bg-[#171b22]"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-[#30343b] px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#e9b74e] px-3 py-2 font-semibold text-black"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-9">
        <section className="mb-9 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-[#e9b74e]">
              YOUR NEXT MATCH STARTS HERE
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Good games. Better company.
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Explore public communities and see what players are talking about.
            </p>
          </div>

          <div className="max-w-xs rounded-xl border border-[#493820] bg-[#17140f] p-4 text-sm">
            {viewer ? (
              <>
                <strong className="text-[#e9c980]">
                  ◎ Welcome back, {viewer.displayName}!
                </strong>
                <p className="mt-1 text-zinc-400">
                  Jump into your gamer profile or share something new.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-[#e9c980]">
                  <Link href="/profile" className="hover:underline">
                    Your profile
                  </Link>
                  <Link href="/posts/new" className="hover:underline">
                    Create a post
                  </Link>
                </div>
              </>
            ) : (
              <>
                <strong className="text-[#e9c980]">◎ Take a look around</strong>
                <p className="mt-1 text-zinc-400">
                  Public content is open. Sign in for full profiles and posting.
                </p>
              </>
            )}
          </div>
        </section>

        {dataState !== 'ready' && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-[#5c4426] bg-[#211a11] p-3 text-sm text-[#e7c788]"
          >
            {dataState === 'unconfigured'
              ? "Faction isn't connected to its data yet, so public content can't be shown."
              : 'Public content could not be loaded. Please try again in a moment.'}
          </div>
        )}

        <section id="communities" className="mb-9">
          <div className="mb-4 flex justify-between gap-3">
            <h2 className="text-lg font-semibold">Gaming Communities</h2>
            <span className="text-xs text-zinc-500">
              Find your game. Explore the conversation.
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCommunities.map((c) => (
              <article
                key={c.id}
                className="min-h-32 rounded-xl border border-[#292d34] bg-gradient-to-br from-[#20242b] to-[#0b0d11] p-4"
              >
                <span className="rounded bg-[#211b12] px-2 py-1 text-[10px] text-[#e9c980]">
                  ◎ PUBLIC
                </span>
                <h3 className="mt-9 font-semibold">{c.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                  {c.description || 'Public gaming community'}
                </p>
              </article>
            ))}
            {filteredCommunities.length === 0 && (
              <p className="col-span-full rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
                No public communities{' '}
                {search ? 'match your search.' : 'available yet.'}
              </p>
            )}
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Public feed <span className="text-[#e9b74e]">◎</span>
              </h2>
              <label className="text-xs text-zinc-400">
                Sort{' '}
                <select
                  aria-label="Sort public posts"
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value as 'newest' | 'popular')
                  }
                  className="ml-2 rounded border border-[#292d34] bg-[#11151b] p-2"
                >
                  <option value="newest">Latest posts</option>
                  <option value="popular">Most liked</option>
                </select>
              </label>
            </div>

            <div className="mb-3 flex items-center justify-between rounded-xl border border-[#292d34] bg-[#101319] p-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Have something to share?
                </h3>
                <p className="text-xs text-zinc-400">
                  {viewer
                    ? '♙ Post to a community you have joined'
                    : '♙ Sign in to create a post'}
                </p>
              </div>
              {viewer ? (
                <Link
                  href="/posts/new"
                  className="rounded-lg bg-[#e9b74e] px-3 py-2 text-sm font-semibold text-black"
                >
                  Create post
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowGate(true)}
                  className="rounded-lg border border-[#30343b] px-3 py-2 text-sm"
                >
                  Create post 🔒
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  action={
                    p.authorUsername &&
                    (viewer ? (
                      <Link
                        href={`/profile/${p.authorUsername}`}
                        className="text-xs text-[#e9c980] hover:underline"
                      >
                        View profile
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowGate(true)}
                        className="text-xs text-[#e9c980]"
                      >
                        View profile 🔒
                      </button>
                    ))
                  }
                />
              ))}
              {filteredPosts.length === 0 && (
                <p className="rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
                  No public posts{' '}
                  {search ? 'match your search.' : 'available yet.'}
                </p>
              )}
            </div>
          </section>

          <aside>
            <h2 className="mb-4 text-lg font-semibold">
              Suggested Gamers <span className="text-[#e9b74e]">♧</span>
            </h2>
            <div className="rounded-xl border border-[#292d34] bg-[#101319] p-5">
              {viewer ? (
                <>
                  <p className="text-sm text-zinc-400">
                    Gamer suggestions are coming soon. Keep your profile ready
                    for when they arrive.
                  </p>
                  <Link
                    href="/profile"
                    className="mt-4 block text-sm text-[#e9c980] hover:underline"
                  >
                    View your profile
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-400">
                    Full gamer profiles are available to signed-in members.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGate(true)}
                    className="mt-4 text-sm text-[#e9c980]"
                  >
                    Explore gamer profiles 🔒
                  </button>
                </>
              )}
            </div>

            {!viewer && (
              <div className="mt-4 rounded-xl border border-[#493820] bg-[#17140f] p-5">
                <p className="text-xs font-semibold text-[#e9b74e]">
                  FROM BROWSING TO BELONGING
                </p>
                <h3 className="mt-4 text-xl">Make your next connection.</h3>
                <p className="my-4 text-sm text-zinc-400">
                  Create an account to explore full profiles and post to the
                  community.
                </p>
                <Link
                  href="/signup"
                  className="block rounded-lg bg-[#e9b74e] px-4 py-3 text-center text-sm font-semibold text-black"
                >
                  Create account →
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>

      <footer className="mt-10 border-t border-[#1e2228] px-5 py-7">
        <div className="mx-auto flex max-w-6xl justify-between text-sm">
          <span className="font-bold text-[#e9c980]">
            <Crest size={20} className="mr-1.5 inline-block align-text-bottom" />
            FACTION{' '}
            <span className="ml-3 font-normal text-zinc-500">
              Play better, together.
            </span>
          </span>
          {!viewer && (
            <span className="text-zinc-500">◎ Browsing as a guest</span>
          )}
        </div>
      </footer>

      {showGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowGate(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#493820] bg-[#131518] p-6 shadow-xl"
          >
            <h2 id="gate-title" className="text-xl font-semibold">
              Join Faction to interact
            </h2>
            <p className="my-4 text-sm text-zinc-400">
              You can browse public content as a guest. Sign in or create an
              account to post and view full profiles.
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-[#41434a] px-4 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#e9b74e] px-4 py-2 font-semibold text-black"
              >
                Create account
              </Link>
              <button
                type="button"
                onClick={() => setShowGate(false)}
                className="ml-auto text-sm text-zinc-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
