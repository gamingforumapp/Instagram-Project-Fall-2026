'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UpdateProfileInput } from '@/types/profile'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Server Action to update the authenticated user's profile.
 * Strictly adheres to schema limits (varchar(30) username, varchar(100) display_name).
 * Enforces uniqueness and a 7-day cooldown on username changes.
 */
export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient()

  // Use getUser() for sensitive write actions (rejects expired/banned sessions)
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return { success: false, error: 'You must be logged in to update your profile.' }
  }

  const updates: {
    username?: string
    display_name?: string
    bio?: string
    avatar_url?: string
  } = {}

  let hasUsernameChange = false
  let trimmedUsername: string | undefined

  if (typeof input.username === 'string') {
    trimmedUsername = input.username.trim().toLowerCase()
    if (trimmedUsername) {
      if (!/^[a-z0-9_]{3,30}$/.test(trimmedUsername)) {
        return {
          success: false,
          error:
            'Username must be 3–30 characters and contain only lowercase letters, numbers, or underscores.',
        }
      }
    }
  }

  // Fetch current profile to compare username and evaluate cooldown
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (trimmedUsername && trimmedUsername !== currentProfile?.username) {
    hasUsernameChange = true

    // Check 1: Uniqueness check across other registered profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmedUsername)
      .neq('id', userData.user.id)
      .maybeSingle()

    if (existingUser) {
      return {
        success: false,
        error: 'That username is already taken. Please choose another one.',
      }
    }

    // Check 2: 7-day cooldown (enforced if user already had a username)
    if (currentProfile?.username) {
      const rawChangedAt =
        (userData.user.user_metadata?.username_changed_at as string | undefined) ||
        userData.user.created_at

      if (rawChangedAt) {
        const lastChanged = new Date(rawChangedAt).getTime()
        const now = Date.now()
        const diffMs = now - lastChanged
        if (diffMs < SEVEN_DAYS_MS) {
          const daysRemaining = Math.ceil((SEVEN_DAYS_MS - diffMs) / (24 * 60 * 60 * 1000))
          return {
            success: false,
            error: `You can only change your username once every 7 days. Please wait ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}.`,
          }
        }
      }
    }

    updates.username = trimmedUsername
  }

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
    if (
      error.code === '23505' ||
      error.message.toLowerCase().includes('unique') ||
      error.message.toLowerCase().includes('already exists')
    ) {
      return {
        success: false,
        error: 'That username is already taken. Please choose another one.',
      }
    }
    if (error.message.toLowerCase().includes('7 days')) {
      return {
        success: false,
        error: error.message,
      }
    }
    return { success: false, error: error.message }
  }

  if (hasUsernameChange && updates.username) {
    // Record username_changed_at timestamp in user metadata
    await supabase.auth.updateUser({
      data: {
        username: updates.username,
        username_changed_at: new Date().toISOString(),
      },
    })
  }

  revalidatePath('/profile')
  if (updates.username) {
    revalidatePath(`/profile/${updates.username}`)
  }
  if (currentProfile?.username && currentProfile.username !== updates.username) {
    revalidatePath(`/profile/${currentProfile.username}`)
  }

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

  // Use getUser() for sensitive write actions
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData?.user) {
    return { success: false, error: 'You must be logged in to update gamer tags.' }
  }

  const userId = userData.user.id

  // Delete existing tags to ensure clean upsert of modern state
  const { error: deleteError } = await supabase
    .from('gamer_tags')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  const inserts: {
    user_id: string
    platform: 'steam' | 'psn' | 'xbox' | 'discord'
    handle: string
  }[] = []

  const platforms: ('steam' | 'psn' | 'xbox' | 'discord')[] = [
    'steam',
    'psn',
    'xbox',
    'discord',
  ]

  for (const platform of platforms) {
    const handle = tags[platform]?.trim()
    if (handle) {
      if (handle.length > 100) {
        return {
          success: false,
          error: `${platform.toUpperCase()} handle must be 100 characters or fewer.`,
        }
      }
      inserts.push({
        user_id: userId,
        platform,
        handle,
      })
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from('gamer_tags')
      .insert(inserts)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath('/profile')
  return { success: true }
}
