'use server'

import { createClient } from '@/lib/supabase/server'
import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from '@/lib/posts/constants'

export type CreatePostInput = {
  communityId: string
  title: string
  content: string
  imagePath: string | null
}

export type CreatePostResult = { ok: true } | { ok: false; error: string }

export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims.sub
  if (!userId) {
    return { ok: false, error: 'Please log in to create a post.' }
  }

  const title = input.title.trim()
  if (!title) {
    return { ok: false, error: 'Please add a title.' }
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Titles can be up to ${MAX_TITLE_LENGTH} characters.`,
    }
  }
  if (input.content.length > MAX_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `Body text can be up to ${MAX_CONTENT_LENGTH} characters.`,
    }
  }
  if (!input.communityId) {
    return { ok: false, error: 'Please select a community.' }
  }
  if (input.imagePath && !input.imagePath.startsWith(`${userId}/`)) {
    return { ok: false, error: 'That image could not be attached.' }
  }

  const { data: membership } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId)
    .eq('community_id', input.communityId)
    .maybeSingle()

  if (!membership) {
    return { ok: false, error: 'Join this community before posting in it.' }
  }

  const { error } = await supabase.from('posts').insert({
    author_id: userId,
    community_id: input.communityId,
    title,
    content: input.content,
    image_path: input.imagePath,
  })

  if (error) {
    return { ok: false, error: 'Your post could not be saved. Please try again.' }
  }

  return { ok: true }
}
