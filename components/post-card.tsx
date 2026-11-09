import type { ReactNode } from 'react'
import type { Tables } from '@/lib/database.types'

export type FeedPost = Pick<
  Tables<'posts'>,
  'id' | 'title' | 'content' | 'created_at' | 'upvote_count'
> & {
  imageUrl: string | null
}

// A fixed locale and time zone, so the server and the browser render the same
// date and React doesn't report a hydration mismatch.
const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

export function ComingSoonAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="flex cursor-not-allowed items-center gap-2 opacity-70"
    >
      {label}
      <span className="rounded bg-[#211b12] px-1.5 py-0.5 text-[10px] text-[#e9c980]">
        Coming soon
      </span>
    </button>
  )
}

export default function PostCard({
  post,
  meta = 'Public post',
  action,
}: {
  post: FeedPost
  meta?: string
  action?: ReactNode
}) {
  return (
    <article className="rounded-xl border border-[#292d34] bg-[#101319] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{post.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {meta} · {dateFormat.format(new Date(post.created_at))}
          </p>
        </div>
        {action}
      </div>
      <p className="mt-5 whitespace-pre-wrap text-sm text-zinc-300">
        {post.content}
      </p>
      {post.imageUrl && (
        // A user upload in the public post-images bucket. next/image
        // would need the Supabase host added to next.config.ts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={`Image from the post: ${post.title}`}
          loading="lazy"
          className="mt-4 max-h-96 rounded-lg border border-[#292d34]"
        />
      )}
      <div className="mt-6 flex flex-wrap gap-5 border-t border-[#23262b] pt-4 text-xs text-zinc-400">
        <ComingSoonAction label={`♡ Like (${post.upvote_count})`} />
        <ComingSoonAction label="◯ Comment" />
      </div>
    </article>
  )
}
