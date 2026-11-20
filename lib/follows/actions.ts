'use server'

import { revalidatePath } from 'next/cache'
import { isUuid } from '@/lib/communities/ids'
import { createClient } from '@/lib/supabase/server'

export type FollowResult = { ok: true } | { ok: false; error: string }

// Postgres codes: the row already exists, and the profile doesn't exist.
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

async function getSignedInUserId() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  return { supabase, userId: auth?.claims.sub ?? null }
}

function refreshFollowPages() {
  revalidatePath('/profile/[username]', 'page')
  revalidatePath('/')
}

export async function followUser(targetId: string): Promise<FollowResult> {
  if (!isUuid(targetId)) {
    return { ok: false, error: 'That gamer could not be found.' }
  }

  const { supabase, userId } = await getSignedInUserId()
  if (!userId) {
    return { ok: false, error: 'Please log in to follow gamers.' }
  }

  if (userId === targetId) {
    return { ok: false, error: "You can't follow yourself." }
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: userId, following_id: targetId })

  // Already following (for example, from another tab): same end result.
  if (error && error.code !== UNIQUE_VIOLATION) {
    return {
      ok: false,
      error:
        error.code === FOREIGN_KEY_VIOLATION
          ? 'That gamer could not be found.'
          : 'Could not follow this gamer. Please try again.',
    }
  }

  refreshFollowPages()
  return { ok: true }
}

export async function unfollowUser(targetId: string): Promise<FollowResult> {
  if (!isUuid(targetId)) {
    return { ok: false, error: 'That gamer could not be found.' }
  }

  const { supabase, userId } = await getSignedInUserId()
  if (!userId) {
    return { ok: false, error: 'Please log in to unfollow gamers.' }
  }

  // Deleting a row that isn't there is fine: the viewer already doesn't follow.
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetId)

  if (error) {
    return {
      ok: false,
      error: 'Could not unfollow this gamer. Please try again.',
    }
  }

  refreshFollowPages()
  return { ok: true }
}
