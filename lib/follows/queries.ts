import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { FollowStats } from '@/types/profile'

/**
 * Follower and following counts for a profile, plus whether the viewer follows
 * it. Only signed-in users can read `follows`, so call this for signed-in
 * viewers only. A signed-out read would return zeros, not real counts.
 * Returns null when any of the queries fails.
 */
export async function getFollowStats(
  profileId: string,
  viewerId: string
): Promise<FollowStats | null> {
  const supabase = await createClient()

  const [followers, following, viewerRow] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId),
    viewerId === profileId
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', viewerId)
          .eq('following_id', profileId)
          .maybeSingle(),
  ])

  if (followers.error || following.error || viewerRow.error) {
    return null
  }

  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    isFollowing: Boolean(viewerRow.data),
  }
}

/** The ids of every gamer the viewer follows. */
export async function getFollowingIds(
  viewerId: string
): Promise<{ ids: string[]; error: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', viewerId)

  if (error) {
    return { ids: [], error: true }
  }

  return { ids: data.map((row) => row.following_id), error: false }
}
