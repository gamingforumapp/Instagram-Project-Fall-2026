import Link from 'next/link'
import type { CommunityListItem } from '@/lib/communities/queries'

/** Member counts are left out: signed-out visitors can't read memberships. */
export function CommunityCard({
  community,
}: {
  community: CommunityListItem
}) {
  return (
    <Link
      href={`/communities/${community.id}`}
      className="block min-h-32 rounded-xl border border-[#292d34] bg-gradient-to-br from-[#20242b] to-[#0b0d11] p-4 transition hover:border-[#e9b74e]/60"
    >
      <span className="rounded bg-[#211b12] px-2 py-1 text-[10px] text-[#e9c980]">
        {community.game?.name ?? 'TOPIC'}
      </span>
      <h2 className="mt-9 font-semibold">{community.name}</h2>
      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
        {community.description || 'Public gaming community'}
      </p>
    </Link>
  )
}
