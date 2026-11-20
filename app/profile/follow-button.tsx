'use client'

import { useState, useTransition } from 'react'
import { followUser, unfollowUser } from '@/lib/follows/actions'

type FollowButtonProps = {
  targetId: string
  isFollowing: boolean
}

export default function FollowButton({
  targetId,
  isFollowing,
}: FollowButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = isFollowing
        ? await unfollowUser(targetId)
        : await followUser(targetId)

      // On success the Server Action refreshes this page, which flips the button.
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={
          isFollowing
            ? 'rounded-lg border border-[#30343b] px-3 py-2 text-sm hover:bg-[#171b22] disabled:opacity-60'
            : 'rounded-lg bg-[#e9b74e] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60'
        }
      >
        {pending
          ? isFollowing
            ? 'Unfollowing…'
            : 'Following…'
          : isFollowing
            ? 'Unfollow'
            : 'Follow'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
