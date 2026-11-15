import 'server-only'

import type { FeedPost } from '@/components/post-card'
import type { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export type PostDetail = FeedPost & {
  author: Pick<Tables<'profiles'>, 'username' | 'display_name'> | null
  community: Pick<Tables<'communities'>, 'id' | 'name'> | null
}

/**
 * One post with its author and community. Spoiler and NSFW posts count as not
 * found until the blur from issue #10 exists, the same as the feeds leave them out.
 */
export async function getPost(
  id: string
): Promise<
  | { status: 'ok'; post: PostDetail }
  | { status: 'not_found' }
  | { status: 'error' }
> {
  const supabase = await createClient()

  // posts reach profiles and communities in more than one way, so both links
  // are named.
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, created_at, upvote_count, image_path, author:profiles!posts_author_id_fkey(username, display_name), community:communities!posts_community_id_fkey(id, name)'
    )
    .eq('id', id)
    .eq('is_nsfw', false)
    .eq('is_spoiler', false)
    .maybeSingle()

  if (error) {
    console.error('[getPost]', error.message)
    return { status: 'error' }
  }
  if (!data) return { status: 'not_found' }

  const { image_path, ...post } = data
  return {
    status: 'ok',
    post: {
      ...post,
      imageUrl: image_path
        ? supabase.storage.from('post-images').getPublicUrl(image_path).data
            .publicUrl
        : null,
    },
  }
}
