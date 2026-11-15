import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { isUuid } from '@/lib/communities/ids'
import { getViewer } from '@/lib/communities/queries'
import { getPost } from '@/lib/posts/queries'

export const dynamic = 'force-dynamic'

// UTC so the server and browser agree, the same as the feeds.
const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

interface PostPageProps {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params
  // Post ids are UUIDs, so anything else can't exist.
  if (!isUuid(id)) notFound()

  const [viewer, postResult] = await Promise.all([getViewer(), getPost(id)])

  if (postResult.status === 'not_found') notFound()

  if (postResult.status === 'error') {
    return (
      <Shell viewer={viewer}>
        <p className="rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
          This post could not be loaded right now. Please refresh the page.
        </p>
      </Shell>
    )
  }

  const { post } = postResult
  const authorName = post.author?.username
    ? `@${post.author.username}`
    : post.author?.display_name || 'Unknown gamer'

  return (
    <Shell viewer={viewer}>
      <Link
        href={post.community ? `/communities/${post.community.id}` : '/'}
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← {post.community ? `Back to ${post.community.name}` : 'Back to Home'}
      </Link>

      <article className="mt-5 rounded-xl border border-[#292d34] bg-[#101319] p-6">
        {post.community && (
          <Link
            href={`/communities/${post.community.id}`}
            className="rounded bg-[#211b12] px-2 py-1 text-[10px] text-[#e9c980] hover:underline"
          >
            ◎ {post.community.name}
          </Link>
        )}

        <h1 className="mt-4 break-words text-2xl font-semibold sm:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 text-xs text-zinc-500">
          by{' '}
          {viewer && post.author?.username ? (
            <Link
              href={`/profile/${post.author.username}`}
              className="text-[#e9c980] hover:underline"
            >
              {authorName}
            </Link>
          ) : (
            <span className="text-zinc-300">{authorName}</span>
          )}{' '}
          · {dateFormat.format(new Date(post.created_at))}
        </p>

        {post.content && (
          <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
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
            className="mt-6 max-w-full rounded-lg border border-[#292d34]"
          />
        )}

        <p className="mt-6 border-t border-[#23262b] pt-4 text-xs text-zinc-400">
          {post.upvote_count} upvote{post.upvote_count === 1 ? '' : 's'}
        </p>
      </article>

      {/* The comments from PR #28 go here once it merges:
          <PostComments postId={post.id} currentUserId={viewer?.userId} /> */}
      <section id="comments" className="mt-8">
        <h2 className="text-lg font-semibold">Comments</h2>
        <p className="mt-4 rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
          Comments are{' '}
          <span className="rounded bg-[#211b12] px-1.5 py-0.5 text-[10px] text-[#e9c980]">
            Coming soon
          </span>
        </p>
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
      <SiteHeader viewer={viewer} />
      <main className="mx-auto max-w-3xl px-5 py-9">{children}</main>
      <SiteFooter viewer={viewer} />
    </div>
  )
}
