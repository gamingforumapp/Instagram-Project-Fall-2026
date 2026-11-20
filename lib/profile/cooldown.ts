import type { UsernameCooldown } from '@/types/profile'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Calculates whether a user can change their username based on the 7-day cooldown.
 */
export function getUsernameCooldown(
  rawChangedAt?: string | null,
  hasExistingUsername = true
): UsernameCooldown {
  if (!hasExistingUsername || !rawChangedAt) {
    return { canChange: true, daysRemaining: 0 }
  }

  const lastChanged = new Date(rawChangedAt).getTime()
  // Current timestamp evaluated for server-rendered page
  const now = Date.now()
  const diffMs = now - lastChanged

  if (diffMs < SEVEN_DAYS_MS) {
    const daysRemaining = Math.ceil((SEVEN_DAYS_MS - diffMs) / (24 * 60 * 60 * 1000))
    return { canChange: false, daysRemaining }
  }

  return { canChange: true, daysRemaining: 0 }
}
