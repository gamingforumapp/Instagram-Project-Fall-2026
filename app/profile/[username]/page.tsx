import type { Metadata } from 'next'
import { getFollowStats } from '@/lib/follows/queries'
import {
  FALLBACK_PROFILE_ID,
  getProfileByUsername,
  getProfileCommunities,
  getProfilePosts,
} from '@/lib/profile/queries'
import { createClient } from '@/lib/supabase/server'
import ProfileContent from '../profile-content'

export const dynamic = 'force-dynamic'

interface ProfileUsernameProps {
  params: Promise<{
    username: string
  }>
}

export async function generateMetadata({
  params,
}: ProfileUsernameProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  return {
    title: `${profile.display_name || profile.username} (@${profile.username}) - Gamer Profile | Faction`,
    description: `View @${profile.username}'s gamer profile, stats, tags, and contributions on Faction.`,
  }
}

export default async function ProfileUsernamePage({
  params,
}: ProfileUsernameProps) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  const supabase = await createClient()
  const [{ data: claimsData }, { posts, error: postsError }, communities] =
    await Promise.all([
      supabase.auth.getClaims(),
      getProfilePosts(profile.id),
      getProfileCommunities(profile.id),
    ])
  const viewerId = claimsData?.claims?.sub ?? null

  // Only signed-in users can read follows, so signed-out visitors get no
  // counts. The sample profile isn't a real account, so it has none either.
  const followStats =
    viewerId && profile.id !== FALLBACK_PROFILE_ID
      ? await getFollowStats(profile.id, viewerId)
      : null

  return (
    <ProfileContent
      profile={profile}
      initialUsername={username}
      isOwnProfile={profile.is_own_profile}
      posts={posts}
      postsError={postsError}
      communities={communities}
      isSignedIn={Boolean(viewerId)}
      followStats={followStats}
    />
  )
}
