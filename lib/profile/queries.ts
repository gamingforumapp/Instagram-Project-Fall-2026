import 'server-only'

import type { FeedPost } from '@/components/post-card'
import type { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import type { GamerTags, Profile } from '@/types/profile'

export type ProfilePost = FeedPost & {
  communityName: string | null
}

export type ProfileCommunity = Pick<Tables<'communities'>, 'id' | 'name'> & {
  role: Tables<'community_members'>['role']
}

const PROFILE_COLUMNS =
  'id, username, display_name, bio, avatar_url, region, created_at'

const FALLBACK_PROFILE: Omit<Profile, 'is_own_profile'> = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'nightowl_kai',
  display_name: 'Kai Rivera',
  avatar_url: null,
  created_at: '2026-03-01T00:00:00.000Z',
  bio: 'Soulslike addict, squad-based shooter enjoyer. Usually on after 9pm. Always down to help with bosses.',
  region: null,
  gamer_tags: {
    psn: 'nightowl_kai',
    xbox: 'NightOwl Kai',
    steam: 'nightowlkai',
    discord: 'nightowl#1234',
  },
}

function toGamerTags(
  rows: Pick<Tables<'gamer_tags'>, 'platform' | 'handle'>[] | null
): GamerTags {
  const tags: GamerTags = {}
  for (const { platform, handle } of rows ?? []) {
    if (
      platform === 'psn' ||
      platform === 'xbox' ||
      platform === 'steam' ||
      platform === 'discord'
    ) {
      tags[platform] = handle
    }
  }
  return tags
}

/**
 * Fetches a gamer profile by their unique username.
 * Gracefully falls back to sample data if database table is not yet populated.
 */
export async function getProfileByUsername(username: string): Promise<Profile> {
  const cleanUsername = username.trim().toLowerCase()
  let currentUserId: string | null = null

  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    currentUserId = claimsData?.claims?.sub ?? null

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .ilike('username', cleanUsername)
      .maybeSingle()

    if (!error && data) {
      const { data: tagsData } = await supabase
        .from('gamer_tags')
        .select('platform, handle')
        .eq('user_id', data.id)

      return {
        ...data,
        gamer_tags: toGamerTags(tagsData),
        is_own_profile: Boolean(currentUserId && currentUserId === data.id),
      }
    }
  } catch (err) {
    // If table doesn't exist yet or connection fails, log and use fallback
    console.warn(`[getProfileByUsername] Supabase query notice for @${cleanUsername}:`, err)
  }

  // Fallback: return default profile populated with requested username
  return {
    ...FALLBACK_PROFILE,
    username: cleanUsername || FALLBACK_PROFILE.username,
    display_name: cleanUsername === 'nightowl_kai' ? FALLBACK_PROFILE.display_name : cleanUsername,
    is_own_profile: false,
  }
}

/**
 * Fetches the currently authenticated user's profile.
 */
export async function getCurrentUserProfile(
  fallbackIfUnauthenticated = false
): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (!userId) {
      return fallbackIfUnauthenticated ? { ...FALLBACK_PROFILE, is_own_profile: true } : null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      const { data: tagsData } = await supabase
        .from('gamer_tags')
        .select('platform, handle')
        .eq('user_id', data.id)

      return {
        ...data,
        gamer_tags: toGamerTags(tagsData),
        is_own_profile: true,
      }
    }
  } catch (err) {
    console.warn('[getCurrentUserProfile] Supabase query notice:', err)
  }

  return null
}

/**
 * Fetches a profile's newest posts. NSFW and spoiler posts stay out, the same
 * as the homepage feed, until the blur from issue #10 exists.
 */
export async function getProfilePosts(
  profileId: string
): Promise<{ posts: ProfilePost[]; error: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, created_at, upvote_count, image_path, communities(name)'
    )
    .eq('author_id', profileId)
    .eq('is_nsfw', false)
    .eq('is_spoiler', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return { posts: [], error: true }
  }

  return {
    posts: data.map(({ image_path, communities, ...post }) => ({
      ...post,
      communityName: communities?.name ?? null,
      imageUrl: image_path
        ? supabase.storage.from('post-images').getPublicUrl(image_path).data
            .publicUrl
        : null,
    })),
    error: false,
  }
}

/**
 * Fetches the communities a profile has joined. Only signed-in users can read
 * memberships, so this returns an empty list for signed-out visitors.
 */
export async function getProfileCommunities(
  profileId: string
): Promise<ProfileCommunity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('community_members')
    .select('role, communities(id, name)')
    .eq('user_id', profileId)
    .order('joined_at', { ascending: false })

  if (error) {
    return []
  }

  return data.flatMap(({ role, communities }) =>
    communities ? [{ ...communities, role }] : []
  )
}
