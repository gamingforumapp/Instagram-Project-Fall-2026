'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UpdateProfileInput } from '@/types/profile'

/**
 * Server Action to update the authenticated user's profile.
 * Strictly adheres to schema limits (varchar(100) display_name).
 */
export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient()

  // Use getUser() for sensitive write actions (rejects expired/banned sessions)
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return { success: false, error: 'You must be logged in to update your profile.' }
  }

  const updates: { display_name?: string; bio?: string; avatar_url?: string } = {}

  if (typeof input.displayName === 'string') {
    const trimmed = input.displayName.trim()
    if (trimmed.length > 100) {
      return { success: false, error: 'Display name must be 100 characters or fewer.' }
    }
    updates.display_name = trimmed || undefined
  }

  if (typeof input.bio === 'string') {
    const trimmed = input.bio.trim()
    if (trimmed.length > 300) {
      return { success: false, error: 'Bio must be 300 characters or fewer.' }
    }
    updates.bio = trimmed || undefined
  }

  if (typeof input.avatarUrl === 'string') {
    updates.avatar_url = input.avatarUrl.trim() || undefined
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No profile changes provided.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userData.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/profile')
  return { success: true }
}

/**
 * Server Action to save or update the authenticated user's gamer tags.
 * Platforms supported by schema: 'steam' | 'psn' | 'xbox' | 'discord'.
 */
export async function saveGamerTags(tags: {
  steam?: string
  psn?: string
  xbox?: string
  discord?: string
}) {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return { success: false, error: 'You must be logged in to update gamer tags.' }
  }

  const userId = userData.user.id
  const entries: { user_id: string; platform: 'steam' | 'psn' | 'xbox' | 'discord'; handle: string }[] = []

  const platforms: ('steam' | 'psn' | 'xbox' | 'discord')[] = ['steam', 'psn', 'xbox', 'discord']
  for (const p of platforms) {
    const handle = tags[p]?.trim()
    if (handle) {
      if (handle.length > 100) {
        return { success: false, error: `${p.toUpperCase()} handle must be 100 characters or fewer.` }
      }
      entries.push({
        user_id: userId,
        platform: p,
        handle,
      })
    }
  }

  // Clear existing tags and insert updated ones (clean sync)
  const { error: deleteError } = await supabase
    .from('gamer_tags')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  if (entries.length > 0) {
    const { error: insertError } = await supabase
      .from('gamer_tags')
      .insert(entries)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath('/profile')
  return { success: true }
}
