'use client'

import { useState, useTransition } from 'react'
import { joinCommunity, leaveCommunity } from '@/lib/communities/actions'

type JoinButtonProps = {
  communityId: string
  isMember: boolean
}

export default function JoinButton({ communityId, isMember }: JoinButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = isMember
        ? await leaveCommunity(communityId)
        : await joinCommunity(communityId)

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
          isMember
            ? 'rounded-lg border border-[#30343b] px-4 py-2 text-sm hover:bg-[#171b22] disabled:opacity-60'
            : 'rounded-lg bg-[#e9b74e] px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60'
        }
      >
        {pending
          ? isMember
            ? 'Leaving…'
            : 'Joining…'
          : isMember
            ? 'Leave community'
            : 'Join community'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
