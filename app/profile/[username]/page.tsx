import type { Metadata } from 'next'
import { getProfileByUsername } from '@/lib/profile/queries'
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
  return (
    <ProfileContent
      profile={profile}
      initialUsername={username}
      isOwnProfile={profile.is_own_profile}
    />
  )
}
