import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'

const FALLBACK_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'nightowl_kai',
  display_name: 'Kai Rivera',
  avatar_url: null,
  created_at: '2026-03-01T00:00:00.000Z',
  bio: 'Soulslike addict, squad-based shooter enjoyer. Usually on after 9pm. Always down to help with bosses.',
  friends_count: 48,
  friend_requests_count: 12,
  contributions_count: 158,
  gamer_tags: {
    psn: 'nightowl_kai',
    xbox: 'NightOwl Kai',
    steam: 'nightowlkai',
    discord: 'nightowl#1234',
  },
  status: {
    is_online: true,
    current_game: 'Helldivers 2',
    usually_on: '9pm – 1am ET',
    mic: 'Yes',
    playstyle: 'Co-op, chill',
    region: 'NA East',
    connection_tags: [
      '#Co-op',
      '#NightOwl',
      '#MicOn',
      '#Crossplay',
      '#HelpWithBosses',
      '#Ranked',
      '#Casual',
    ],
  },
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
      .select('id, username, display_name, bio, avatar_url, region, created_at')
      .ilike('username', cleanUsername)
      .maybeSingle()

    if (!error && data) {
      const isOwnProfile = Boolean(currentUserId && currentUserId === data.id)

      // Query gamer tags for this user
      const { data: tagsData } = await supabase
        .from('gamer_tags')
        .select('platform, handle')
        .eq('user_id', data.id)

      const tags: { psn?: string; xbox?: string; steam?: string; discord?: string } = {}
      if (tagsData && tagsData.length > 0) {
        for (const tag of tagsData) {
          if (tag.platform === 'psn') tags.psn = tag.handle
          if (tag.platform === 'xbox') tags.xbox = tag.handle
          if (tag.platform === 'steam') tags.steam = tag.handle
          if (tag.platform === 'discord') tags.discord = tag.handle
        }
      }

      return {
        id: data.id,
        username: data.username || cleanUsername,
        display_name: data.display_name || data.username || cleanUsername,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        bio: data.bio ?? undefined,
        friends_count: 0,
        friend_requests_count: 0,
        contributions_count: 0,
        gamer_tags: tags,
        status: {
          is_online: true,
          usually_on: 'Evenings',
          mic: 'Yes',
          playstyle: 'Casual',
          region: data.region ? data.region.toUpperCase() : 'NA',
          connection_tags: ['#Co-op', '#Crossplay'],
        },
        is_own_profile: isOwnProfile,
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
      .select('id, username, display_name, bio, avatar_url, region, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      // Query gamer tags for this user
      const { data: tagsData } = await supabase
        .from('gamer_tags')
        .select('platform, handle')
        .eq('user_id', data.id)

      const tags: { psn?: string; xbox?: string; steam?: string; discord?: string } = {}
      if (tagsData && tagsData.length > 0) {
        for (const tag of tagsData) {
          if (tag.platform === 'psn') tags.psn = tag.handle
          if (tag.platform === 'xbox') tags.xbox = tag.handle
          if (tag.platform === 'steam') tags.steam = tag.handle
          if (tag.platform === 'discord') tags.discord = tag.handle
        }
      }

      return {
        id: data.id,
        username: data.username || 'gamer',
        display_name: data.display_name || data.username || 'Gamer',
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        bio: data.bio ?? undefined,
        friends_count: 0,
        friend_requests_count: 0,
        contributions_count: 0,
        gamer_tags: tags,
        status: {
          is_online: true,
          usually_on: 'Evenings',
          mic: 'Yes',
          playstyle: 'Casual',
          region: data.region ? data.region.toUpperCase() : 'NA',
          connection_tags: ['#NewGamer', '#Co-op'],
        },
        is_own_profile: true,
      }
    }
  } catch (err) {
    console.warn('[getCurrentUserProfile] Supabase query notice:', err)
  }

  return null
}
