'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Crest from '@/components/crest'
import PostCard, { ComingSoonAction } from '@/components/post-card'
import { saveGamerTags, updateProfile } from '@/lib/profile/actions'
import type { ProfileCommunity, ProfilePost } from '@/lib/profile/queries'
import { createClient } from '@/lib/supabase/client'
import type { GamerTags, Profile } from '@/types/profile'

interface ProfileContentProps {
  profile?: Profile
  initialUsername?: string
  isOwnProfile?: boolean
  posts: ProfilePost[]
  postsError: boolean
  communities: ProfileCommunity[]
  isSignedIn: boolean
}

const GAMER_TAG_PLATFORMS: {
  key: keyof GamerTags
  label: string
  field: string
  placeholder: string
}[] = [
  { key: 'psn', label: 'PSN', field: 'PSN ID', placeholder: 'e.g. nightowl_kai' },
  { key: 'xbox', label: 'Xbox', field: 'Xbox Gamertag', placeholder: 'e.g. NightOwl Kai' },
  { key: 'steam', label: 'Steam', field: 'Steam Username', placeholder: 'e.g. nightowlkai' },
  { key: 'discord', label: 'Discord', field: 'Discord Handle', placeholder: 'e.g. nightowl#1234' },
]

// A fixed locale and time zone, so the server and the browser render the same
// date and React doesn't report a hydration mismatch.
const joinedFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const primaryButton =
  'rounded-lg bg-[#e9b74e] px-3 py-2 text-sm font-semibold text-black'
const secondaryButton =
  'rounded-lg border border-[#30343b] px-3 py-2 text-sm hover:bg-[#171b22]'
const card = 'rounded-xl border border-[#292d34] bg-[#101319] p-5'
const fieldLabel = 'block text-xs font-semibold text-zinc-400'
const fieldInput =
  'mt-1 block w-full rounded-lg border border-[#282c34] bg-[#11151b] px-3 py-2 text-sm outline-none focus:border-[#e9b74e]'

export default function ProfileContent({
  profile,
  initialUsername,
  isOwnProfile = true,
  posts,
  postsError,
  communities,
  isSignedIn,
}: ProfileContentProps) {
  const router = useRouter()
  const isOwner = isOwnProfile

  const [copiedProfileLink, setCopiedProfileLink] = useState(false)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editTags, setEditTags] = useState<GamerTags>({})
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const username = profile?.username ?? initialUsername ?? null
  const displayName = profile?.display_name || username || 'Gamer'
  const avatarInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'GM'
  const bio = profile?.bio
  const gamerTags = profile?.gamer_tags ?? {}
  const hasGamerTags = GAMER_TAG_PLATFORMS.some(({ key }) => gamerTags[key])

  const copyToClipboard = (platform: string, tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopiedTag(platform)
    setTimeout(() => {
      setCopiedTag(null)
    }, 2000)
  }

  const handleShareProfile = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/profile/${username}`
    )
    setCopiedProfileLink(true)
    setTimeout(() => setCopiedProfileLink(false), 2000)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setEditStatus(null)

    const profileRes = await updateProfile({
      displayName: editDisplayName,
      bio: editBio,
    })

    if (!profileRes.success) {
      setEditStatus(profileRes.error || 'Failed to update profile.')
      setIsSaving(false)
      return
    }

    const tagsRes = await saveGamerTags(editTags)

    if (!tagsRes.success) {
      setEditStatus(tagsRes.error || 'Profile updated, but failed to save gamer tags.')
    } else {
      setEditStatus('Profile and gamer tags updated successfully!')
      router.refresh()
      setTimeout(() => {
        setIsEditing(false)
        setEditStatus(null)
      }, 1200)
    }
    setIsSaving(false)
  }

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const openEditModal = () => {
    setEditDisplayName(profile?.display_name ?? '')
    setEditBio(bio ?? '')
    setEditTags(gamerTags)
    setIsEditing(true)
  }

  return (
    <div className="min-h-screen bg-[#07090b] text-[#f4f1eb]">
      <header className="border-b border-[#1e2228] bg-[#090b0e]">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold tracking-wide text-[#e8c36b]"
          >
            <Crest size={32} />
            FACTION
          </Link>

          <div className="ml-auto flex flex-wrap items-center gap-3 whitespace-nowrap text-sm">
            <Link href="/" className="text-zinc-400 hover:text-white">
              ⌂ Home
            </Link>
            <Link href="/#communities" className="text-zinc-400 hover:text-white">
              Communities
            </Link>

            {isSignedIn ? (
              <>
                <Link href="/profile" className={secondaryButton}>
                  Your profile
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className={secondaryButton}
                >
                  {isLoggingOut ? 'Signing out...' : 'Log out'}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg border border-[#30343b] px-3 py-2">
                  Sign in
                </Link>
                <Link href="/signup" className={primaryButton}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-9">
        <section className="rounded-xl border border-[#292d34] bg-[#101319]">
          <div className="h-32 rounded-t-xl bg-gradient-to-br from-[#3a2d14] via-[#20242b] to-[#0b0d11] sm:h-44" />

          <div className="px-5 pb-6 sm:px-6">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
              {profile?.avatar_url ? (
                // An OAuth picture or a user upload. next/image would need
                // each host added to next.config.ts.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={`${displayName}'s avatar`}
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-full border-4 border-[#101319] object-cover sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#101319] bg-[#17140f] text-3xl font-bold text-[#e9c980] sm:h-28 sm:w-28">
                  {avatarInitials}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {isOwner ? (
                  <>
                    <button type="button" onClick={openEditModal} className={primaryButton}>
                      Edit profile
                    </button>

                    {username && (
                      <button type="button" onClick={handleShareProfile} className={secondaryButton}>
                        {copiedProfileLink ? 'Link copied!' : 'Share profile'}
                      </button>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                        className={`${secondaryButton} flex h-9 w-9 items-center justify-center !p-0`}
                        aria-label="Settings"
                        title="Account settings"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>

                      {showSettingsMenu && (
                        <div className="absolute right-0 top-11 z-40 w-44 rounded-lg border border-[#30343b] bg-[#131518] py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettingsMenu(false)
                              openEditModal()
                            }}
                            className="flex w-full px-4 py-2 text-xs hover:bg-[#171b22]"
                          >
                            Edit profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettingsMenu(false)
                              handleSignOut()
                            }}
                            disabled={isLoggingOut}
                            className="flex w-full px-4 py-2 text-xs font-medium text-red-400 hover:bg-[#171b22]"
                          >
                            {isLoggingOut ? 'Signing out...' : 'Sign out'}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-[#30343b] px-3 py-2 text-sm">
                    <ComingSoonAction label="Follow" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h1 className="break-words text-3xl font-semibold tracking-tight">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {username ? `@${username}` : 'No username yet'}
              </p>
            </div>

            <div className="mt-4 max-w-2xl text-sm text-zinc-300">
              {bio ? (
                <p className="whitespace-pre-wrap">{bio}</p>
              ) : isOwner ? (
                <p className="rounded-lg border border-[#493820] bg-[#17140f] p-3 text-xs text-zinc-400">
                  You haven&apos;t added a bio yet.{' '}
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="font-semibold text-[#e9c980] hover:underline"
                  >
                    Click Edit profile
                  </button>{' '}
                  to tell other gamers about your favorite games, squad style, and when you play.
                </p>
              ) : (
                <p className="text-xs text-zinc-500">This gamer has not added a bio yet.</p>
              )}
            </div>

            {profile && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span>Joined {joinedFormat.format(new Date(profile.created_at))}</span>
                {profile.region && (
                  <span className="rounded bg-[#211b12] px-2 py-1 text-[10px] text-[#e9c980]">
                    ◎ {profile.region.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className={`mt-4 ${card}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-[#e9b74e]">
              CONNECT WITH ME
            </h2>
            {isOwner && (
              <button
                type="button"
                onClick={openEditModal}
                className="text-xs text-[#e9c980] hover:underline"
              >
                Edit handles
              </button>
            )}
          </div>

          {hasGamerTags ? (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {GAMER_TAG_PLATFORMS.map(({ key, label }) => {
                const handle = gamerTags[key]
                if (!handle) return null
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-[#30343b] bg-[#11151b] px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold">{label}</span>
                    <span className="break-all font-mono text-zinc-400">{handle}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(key, handle)}
                      className="rounded border border-[#30343b] px-2 py-0.5 text-[11px] hover:bg-[#171b22]"
                    >
                      {copiedTag === key ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              {isOwner
                ? 'No gamer tags connected yet. Click Edit handles to link your PSN, Xbox, Steam, or Discord.'
                : isSignedIn
                  ? 'No gamer tags linked yet.'
                  : 'Sign in to see gamer tags.'}
            </p>
          )}
        </section>

        <div className="mt-9 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <h2 className="mb-4 text-lg font-semibold">
              Posts <span className="text-[#e9b74e]">◎</span>
            </h2>

            {postsError && (
              <div
                role="status"
                className="mb-3 rounded-lg border border-[#5c4426] bg-[#211a11] p-3 text-sm text-[#e7c788]"
              >
                Posts could not be loaded. Please try again in a moment.
              </div>
            )}

            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  meta={post.communityName ? `in ${post.communityName}` : 'Profile post'}
                />
              ))}

              {!postsError && posts.length === 0 && (
                <div className="rounded-xl border border-[#292d34] p-6 text-sm text-zinc-400">
                  {isOwner ? (
                    <>
                      You haven&apos;t posted yet.{' '}
                      <Link href="/posts/new" className="text-[#e9c980] hover:underline">
                        Create your first post
                      </Link>
                    </>
                  ) : (
                    'No posts yet.'
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Communities <span className="text-[#e9b74e]">♧</span>
              </h2>
              <div className={card}>
                {communities.length > 0 ? (
                  <ul className="space-y-3">
                    {communities.map((community) => (
                      <li key={community.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 break-words">{community.name}</span>
                        {community.role !== 'member' && (
                          <span className="rounded bg-[#211b12] px-2 py-1 text-[10px] text-[#e9c980] capitalize">
                            {community.role}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-400">
                    {!isSignedIn
                      ? 'Sign in to see communities.'
                      : isOwner
                        ? "You haven't joined a community yet."
                        : 'No communities joined yet.'}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#493820] bg-[#17140f] p-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-[#e9c980]">Favorite games</strong>
                <span className="rounded bg-[#211b12] px-1.5 py-0.5 text-[10px] text-[#e9c980]">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-zinc-400">
                Soon you&apos;ll be able to show off the games you play.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-10 border-t border-[#1e2228] px-5 py-7">
        <div className="mx-auto flex max-w-6xl justify-between text-sm">
          <span className="font-bold text-[#e9c980]">
            <Crest size={20} className="mr-1.5 inline-block align-text-bottom" />
            FACTION{' '}
            <span className="ml-3 font-normal text-zinc-500">
              Play better, together.
            </span>
          </span>
          {!isSignedIn && (
            <span className="text-zinc-500">◎ Browsing as a guest</span>
          )}
        </div>
      </footer>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-[#493820] bg-[#131518] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#23262b] pb-3">
              <h2 id="edit-profile-title" className="text-xl font-semibold">
                Edit gamer profile
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Close"
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              {editStatus && (
                <div
                  role="status"
                  className="rounded-lg border border-[#5c4426] bg-[#211a11] p-2.5 text-xs text-[#e7c788]"
                >
                  {editStatus}
                </div>
              )}

              <label className={fieldLabel}>
                Display name (max 100 characters)
                <input
                  type="text"
                  maxLength={100}
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className={`${fieldInput} font-normal text-[#f4f1eb]`}
                />
              </label>

              <label className={fieldLabel}>
                Bio (max 300 characters)
                <textarea
                  rows={3}
                  maxLength={300}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the community about what you play, squad preferences, etc."
                  className={`${fieldInput} font-normal text-[#f4f1eb]`}
                />
                <span className="mt-1 block text-right text-[10px] font-normal text-zinc-500">
                  {editBio.length}/300
                </span>
              </label>

              <div className="border-t border-[#23262b] pt-3">
                <p className="mb-2 text-xs font-semibold tracking-wider text-[#e9b74e]">
                  CONNECTED GAMER HANDLES
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {GAMER_TAG_PLATFORMS.map(({ key, field, placeholder }) => (
                    <label key={key} className={fieldLabel}>
                      {field}
                      <input
                        type="text"
                        maxLength={100}
                        value={editTags[key] ?? ''}
                        onChange={(e) =>
                          setEditTags((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={placeholder}
                        className={`${fieldInput} font-normal text-[#f4f1eb]`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={secondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`${primaryButton} disabled:opacity-50`}
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
