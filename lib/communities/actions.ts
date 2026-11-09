'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/communities/ids'

export type MembershipResult = { ok: true } | { ok: false; error: string }

// Postgres code for "this row already exists".
const UNIQUE_VIOLATION = '23505'

async function getSignedInUserId() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  return { supabase, userId: auth?.claims.sub ?? null }
}

function refreshCommunityPages(communityId: string) {
  revalidatePath(`/communities/${communityId}`)
  revalidatePath('/communities')
}

export async function joinCommunity(
  communityId: string
): Promise<MembershipResult> {
  if (!isUuid(communityId)) {
    return { ok: false, error: 'That community could not be found.' }
  }

  const { supabase, userId } = await getSignedInUserId()
  if (!userId) {
    return { ok: false, error: 'Please log in to join a community.' }
  }

  // Users can only insert user_id and community_id, so the role is always 'member'.
  const { error } = await supabase
    .from('community_members')
    .insert({ user_id: userId, community_id: communityId })

  // Already a member (for example, joined in another tab): same end result.
  if (error && error.code !== UNIQUE_VIOLATION) {
    return {
      ok: false,
      error: 'Could not join this community. Please try again.',
    }
  }

  refreshCommunityPages(communityId)
  return { ok: true }
}

export async function leaveCommunity(
  communityId: string
): Promise<MembershipResult> {
  if (!isUuid(communityId)) {
    return { ok: false, error: 'That community could not be found.' }
  }

  const { supabase, userId } = await getSignedInUserId()
  if (!userId) {
    return { ok: false, error: 'Please log in to leave a community.' }
  }

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membership?.role === 'owner') {
    // The database blocks this too; this gives a clear message instead of a silent no-op.
    return {
      ok: false,
      error: "Owners can't leave their own community.",
    }
  }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)

  if (error) {
    return {
      ok: false,
      error: 'Could not leave this community. Please try again.',
    }
  }

  refreshCommunityPages(communityId)
  return { ok: true }
}
