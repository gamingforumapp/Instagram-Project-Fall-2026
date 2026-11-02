export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
  // Extended fields with sensible defaults for mockup & future schema extensions
  bio?: string
  friends_count?: number
  friend_requests_count?: number
  contributions_count?: number
  gamer_tags?: {
    psn?: string
    xbox?: string
    steam?: string
    discord?: string
  }
  status?: {
    is_online: boolean
    current_game?: string
    usually_on?: string
    mic?: string
    playstyle?: string
    region?: string
    connection_tags?: string[]
  }
  is_own_profile?: boolean
}

export interface UpdateProfileInput {
  displayName?: string
  bio?: string
  avatarUrl?: string
}
