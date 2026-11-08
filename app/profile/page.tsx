import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentUserProfile,
  getProfileCommunities,
  getProfilePosts,
} from '@/lib/profile/queries'
import ProfileContent from './profile-content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gamer Profile - Faction',
  description: 'View gamer profile, favorite games, connection tags, and activity on Faction.',
}

interface ProfilePageProps {
  searchParams: Promise<{
    preview?: string
  }>
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { preview } = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  const isPreview = preview === 'true' || preview === 'owner'

  if (!userId && !isPreview) {
    redirect('/login?next=/profile')
  }

  const profile = (await getCurrentUserProfile(isPreview)) || undefined
  const [{ posts, error: postsError }, communities] = await Promise.all([
    profile ? getProfilePosts(profile.id) : { posts: [], error: false },
    profile ? getProfileCommunities(profile.id) : [],
  ])

  return (
    <ProfileContent
      profile={profile}
      isOwnProfile={true}
      posts={posts}
      postsError={postsError}
      communities={communities}
      isSignedIn={Boolean(userId)}
    />
  )
}
