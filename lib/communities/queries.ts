import 'server-only'

import type { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export type CommunityListItem = Pick<
  Tables<'communities'>,
  'id' | 'name' | 'description'
> & {
  game: { name: string } | null
}

export type CommunityDetail = Pick<
  Tables<'communities'>,
  'id' | 'name' | 'description' | 'created_at'
> & {
  game: { name: string } | null
}

export type CommunityPost = Pick<
  Tables<'posts'>,
  'id' | 'title' | 'content' | 'created_at' | 'upvote_count'
> & {
  authorUsername: string | null
  imageUrl: string | null
}

export type MembershipRole = Tables<'community_members'>['role'] | null

export type Viewer = { userId: string; displayName: string }

/** The signed-in user, or null for a visitor. Uses getClaims(), as AGENTS.md requires. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims.sub
  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', userId)
    .maybeSingle()

  return {
    userId,
    displayName: profile?.display_name || profile?.username || 'Gamer',
  }
}

/** Every community, newest first. Signed-out visitors can read these. */
export async function getCommunities(): Promise<
  { ok: true; communities: CommunityListItem[] } | { ok: false }
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description, game:games!communities_game_id_fkey(name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCommunities]', error.message)
    return { ok: false }
  }

  return { ok: true, communities: data }
}

export async function getCommunity(
  id: string
): Promise<
  | { status: 'ok'; community: CommunityDetail }
  | { status: 'not_found' }
  | { status: 'error' }
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('communities')
    .select(
      'id, name, description, created_at, game:games!communities_game_id_fkey(name)'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getCommunity]', error.message)
    return { status: 'error' }
  }
  if (!data) return { status: 'not_found' }

  return { status: 'ok', community: data }
}

/**
 * Newest posts in one community. Spoiler and NSFW posts are left out until the
 * blur from issue #10 exists, the same as on the homepage.
 */
export async function getCommunityPosts(
  communityId: string
): Promise<{ ok: true; posts: CommunityPost[] } | { ok: false }> {
  const supabase = await createClient()

  // posts also reach profiles through post_votes, so name the author link.
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, created_at, upvote_count, image_path, profiles!posts_author_id_fkey(username)'
    )
    .eq('community_id', communityId)
    .eq('is_nsfw', false)
    .eq('is_spoiler', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getCommunityPosts]', error.message)
    return { ok: false }
  }

  const posts = data.map(({ image_path, profiles, ...post }) => ({
    ...post,
    authorUsername: profiles?.username ?? null,
    imageUrl: image_path
      ? supabase.storage.from('post-images').getPublicUrl(image_path).data
          .publicUrl
      : null,
  }))

  return { ok: true, posts }
}

/** The user's role in a community, or null if they haven't joined. Only signed-in users can read memberships. */
export async function getMembershipRole(
  communityId: string,
  userId: string
): Promise<MembershipRole> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getMembershipRole]', error.message)
    return null
  }

  return data?.role ?? null
}
