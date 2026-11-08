import type { Metadata } from 'next'
import {
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

  return (
    <ProfileContent
      profile={profile}
      initialUsername={username}
      isOwnProfile={profile.is_own_profile}
      posts={posts}
      postsError={postsError}
      communities={communities}
      isSignedIn={Boolean(claimsData?.claims?.sub)}
    />
  )
}
