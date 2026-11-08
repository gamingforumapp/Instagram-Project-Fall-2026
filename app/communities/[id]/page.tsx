import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { isUuid } from '@/lib/communities/ids'
import {
  getCommunity,
  getCommunityPosts,
  getMembershipRole,
  getViewer,
  type CommunityPost,
} from '@/lib/communities/queries'
import JoinButton from './join-button'

export const dynamic = 'force-dynamic'

// UTC so the server and browser agree, the same as the homepage.
const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

interface CommunityPageProps {
  params: Promise<{ id: string }>
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const [viewer, communityResult, postsResult] = await Promise.all([
    getViewer(),
    getCommunity(id),
    getCommunityPosts(id),
  ])

  if (communityResult.status === 'not_found') notFound()

  if (communityResult.status === 'error') {
    return (
      <Shell viewer={viewer}>
        <p className="rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
          This community could not be loaded right now. Please refresh the page.
        </p>
      </Shell>
    )
  }

  const { community } = communityResult
  const role = viewer ? await getMembershipRole(community.id, viewer.userId) : null

  return (
    <Shell viewer={viewer}>
      <Link href="/communities" className="text-sm text-zinc-400 hover:text-white">
        ← All communities
      </Link>

      <section className="mt-5 flex flex-wrap items-start justify-between gap-5 rounded-xl border border-[#292d34] bg-gradient-to-br from-[#20242b] to-[#0b0d11] p-6">
        <div className="min-w-0 max-w-2xl">
          <span className="rounded bg-[#211b12] px-2 py-1 text-[10px] text-[#e9c980]">
            {community.game?.name ?? 'TOPIC'}
          </span>
          <h1 className="mt-4 text-3xl font-semibold">{community.name}</h1>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
            {community.description || 'Public gaming community'}
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Created {dateFormat.format(new Date(community.created_at))}
          </p>
        </div>

        {!viewer ? (
          <Link
            href="/login"
            className="rounded-lg bg-[#e9b74e] px-4 py-2 text-sm font-semibold text-black"
          >
            Sign in to join
          </Link>
        ) : role === 'owner' ? (
          <span className="rounded-lg border border-[#30343b] px-4 py-2 text-sm text-[#e9c980]">
            You own this community
          </span>
        ) : (
          <JoinButton communityId={community.id} isMember={role !== null} />
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Posts</h2>
          {role !== null && (
            <Link
              href="/posts/new"
              className="rounded-lg border border-[#30343b] px-3 py-2 text-sm hover:bg-[#171b22]"
            >
              Create post
            </Link>
          )}
        </div>

        {!postsResult.ok ? (
          <p className="rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
            Posts could not be loaded right now. Please refresh the page.
          </p>
        ) : postsResult.posts.length === 0 ? (
          <p className="rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
            No posts in this community yet.
            {role === null && viewer ? ' Join it to be the first to post.' : ''}
          </p>
        ) : (
          <div className="space-y-3">
            {postsResult.posts.map((post) => (
              <PostItem key={post.id} post={post} signedIn={Boolean(viewer)} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  )
}

function Shell({
  viewer,
  children,
}: {
  viewer: { displayName: string } | null
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#07090b] text-[#f4f1eb]">
      <SiteHeader active="communities" viewer={viewer} />
      <main className="mx-auto max-w-6xl px-5 py-9">{children}</main>
    </div>
  )
}

// Likes and comments are not built yet, so only the vote count is shown, as text.
function PostItem({ post, signedIn }: { post: CommunityPost; signedIn: boolean }) {
  return (
    <article className="rounded-xl border border-[#292d34] bg-[#101319] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{post.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {dateFormat.format(new Date(post.created_at))}
          </p>
        </div>
        {post.authorUsername && signedIn && (
          <Link
            href={`/profile/${post.authorUsername}`}
            className="shrink-0 text-xs text-[#e9c980] hover:underline"
          >
            View profile
          </Link>
        )}
      </div>

      {post.content && (
        <p className="mt-5 whitespace-pre-wrap text-sm text-zinc-300">
          {post.content}
        </p>
      )}
      {post.imageUrl && (
        // A user upload in the public post-images bucket. next/image would need
        // the Supabase host added to next.config.ts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={`Image from the post: ${post.title}`}
          loading="lazy"
          className="mt-4 max-h-96 rounded-lg border border-[#292d34]"
        />
      )}
      <p className="mt-6 border-t border-[#23262b] pt-4 text-xs text-zinc-400">
        {post.upvote_count} upvote{post.upvote_count === 1 ? '' : 's'}
      </p>
    </article>
  )
}
