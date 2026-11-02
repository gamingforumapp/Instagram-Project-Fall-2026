import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/profile/queries'
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
  return <ProfileContent profile={profile} isOwnProfile={true} />
}
