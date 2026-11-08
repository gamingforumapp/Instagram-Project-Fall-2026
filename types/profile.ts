import type { Tables } from '@/lib/database.types'

export type GamerTags = Partial<
  Record<'psn' | 'xbox' | 'steam' | 'discord', string>
>

export type Profile = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'username'
  | 'display_name'
  | 'bio'
  | 'avatar_url'
  | 'region'
  | 'created_at'
> & {
  gamer_tags: GamerTags
  is_own_profile: boolean
}

export interface UpdateProfileInput {
  displayName?: string
  bio?: string
  avatarUrl?: string
}
