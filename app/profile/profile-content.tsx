'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/profile'
import { updateProfile, saveGamerTags } from '@/lib/profile/actions'
import { createClient } from '@/lib/supabase/client'

interface ProfileContentProps {
  profile?: Profile
  initialUsername?: string
  isOwnProfile?: boolean
}

export default function ProfileContent({
  profile,
  initialUsername,
  isOwnProfile = true,
}: ProfileContentProps) {
  const router = useRouter()
  const supabase = createClient()

  const [perspective, setPerspective] = useState<'owner' | 'visitor'>(
    isOwnProfile ? 'owner' : 'visitor'
  )
  const isOwner = perspective === 'owner'

  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'forums' | 'media'>('all')
  const [friendStatus, setFriendStatus] = useState<'none' | 'sent'>('none')
  const [inviteSent, setInviteSent] = useState(false)
  const [copiedProfileLink, setCopiedProfileLink] = useState(false)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState(profile?.display_name || 'Gamer')
  const [editBio, setEditBio] = useState(profile?.bio || '')
  const [editPsn, setEditPsn] = useState(profile?.gamer_tags?.psn || '')
  const [editXbox, setEditXbox] = useState(profile?.gamer_tags?.xbox || '')
  const [editSteam, setEditSteam] = useState(profile?.gamer_tags?.steam || '')
  const [editDiscord, setEditDiscord] = useState(profile?.gamer_tags?.discord || '')
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [likes, setLikes] = useState<{ [key: string]: { count: number; active: boolean } }>({
    post1: { count: 132, active: false },
    post2: { count: 45, active: false },
  })

  // Dynamic derived data with fallbacks
  const isNightowlDemo = (profile?.username || initialUsername) === 'nightowl_kai'

  const displayName =
    profile?.display_name || (isNightowlDemo ? 'Kai Rivera' : profile?.username || 'Gamer')
  const username = profile?.username || initialUsername || (isNightowlDemo ? 'nightowl_kai' : 'gamer')
  const avatarInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'GM'

  const bio =
    profile?.bio !== undefined
      ? profile.bio
      : isNightowlDemo
        ? 'Soulslike addict, squad-based shooter enjoyer. Usually on after 9pm. Always down to help with bosses.'
        : undefined

  const friendsCount = profile?.friends_count ?? (isNightowlDemo ? 48 : 0)
  const friendRequestsCount = profile?.friend_requests_count ?? (isNightowlDemo ? 12 : 0)
  const contributionsCount = profile?.contributions_count ?? (isNightowlDemo ? 158 : 0)

  const gamerTags =
    profile?.gamer_tags ||
    (isNightowlDemo
      ? {
          psn: 'nightowl_kai',
          xbox: 'NightOwl Kai',
          steam: 'nightowlkai',
          discord: 'nightowl#1234',
        }
      : {})

  const gamerStatus = profile?.status || {
    is_online: true,
    current_game: isNightowlDemo ? 'Helldivers 2' : undefined,
    usually_on: 'Evenings',
    mic: 'Yes',
    playstyle: 'Co-op, chill',
    region: 'NA East',
    connection_tags: ['#Co-op', '#NightOwl', '#MicOn', '#Crossplay'],
  }

  const copyToClipboard = (platform: string, tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopiedTag(platform)
    setTimeout(() => {
      setCopiedTag(null)
    }, 2000)
  }

  const toggleLike = (postId: string) => {
    setLikes((prev) => {
      const current = prev[postId]
      return {
        ...prev,
        [postId]: {
          count: current.active ? current.count - 1 : current.count + 1,
          active: !current.active,
        },
      }
    })
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

    const tagsRes = await saveGamerTags({
      psn: editPsn,
      xbox: editXbox,
      steam: editSteam,
      discord: editDiscord,
    })

    if (!tagsRes.success) {
      setEditStatus(tagsRes.error || 'Profile updated, but failed to save gamer tags.')
    } else {
      setEditStatus('Profile and gamer tags updated successfully!')
      setTimeout(() => {
        setIsEditing(false)
        setEditStatus(null)
      }, 1200)
    }
    setIsSaving(false)
  }

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const openEditModal = () => {
    setEditDisplayName(displayName)
    setEditBio(bio || '')
    setEditPsn(gamerTags.psn || '')
    setEditXbox(gamerTags.xbox || '')
    setEditSteam(gamerTags.steam || '')
    setEditDiscord(gamerTags.discord || '')
    setIsEditing(true)
  }

  const connectionTags = gamerStatus.connection_tags || [
    '#Co-op',
    '#NightOwl',
    '#MicOn',
    '#Crossplay',
    '#HelpWithBosses',
    '#Ranked',
    '#Casual',
  ]

  const games = [
    {
      title: 'Helldivers 2',
      platform: 'PS5',
      time: 'Playing now',
      isPlayingNow: true,
    },
    {
      title: 'Elden Ring',
      platform: 'PS5',
      time: '2d ago',
      isPlayingNow: false,
    },
    {
      title: 'EA Sports FC 26',
      platform: 'Xbox',
      time: '1d ago',
      isPlayingNow: false,
    },
    {
      title: 'Baldur\'s Gate 3',
      platform: 'Steam',
      time: '1w ago',
      isPlayingNow: false,
    },
  ]

  const circles = [
    {
      initials: 'MT',
      name: 'Malenia Trauma Club',
      visibility: 'Private',
      members: '14 members',
    },
    {
      initials: 'D9',
      name: 'Dive Squad 9',
      visibility: 'Private',
      members: '6 members',
    },
    {
      initials: 'NJ',
      name: 'NJ Pro Clubs',
      visibility: 'Public',
      members: '88 members',
    },
    {
      initials: 'LN',
      name: 'Late Night Co-op',
      visibility: 'Public',
      members: '230 members',
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-[#0a0a0c] dark:text-zinc-100">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-[#0f0f12]/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-black uppercase tracking-wider text-zinc-950 dark:text-white"
            >
              FACTION
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/"
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                Home
              </Link>
              <Link
                href="/forums"
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                Forums
              </Link>
              <Link
                href="/circles"
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                Circles
              </Link>
              <Link
                href="/news"
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                News
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative hidden sm:block">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search players, games, forums"
                className="w-64 rounded-full border border-zinc-200 bg-zinc-100 py-1.5 pr-4 pl-10 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-500 dark:focus:border-zinc-700"
              />
            </div>

            {/* Log Out button */}
            {isOwner && (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white"
              >
                {isLoggingOut ? 'Signing out...' : 'Log out'}
              </button>
            )}

            {/* Current User Avatar */}
            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-zinc-200 text-xs font-bold text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              title="Your Profile"
            >
              {avatarInitials}
            </Link>
          </div>
        </div>
      </header>

      {/* 2. PROFILE HERO CONTAINER */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Perspective preview switcher for testing & verification */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-xs shadow-xs backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className={`inline-block h-2 w-2 rounded-full ${isOwner ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
            <span className="font-medium text-zinc-500">Perspective:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {isOwner ? 'Your Profile (Owner View)' : `@${username}'s Profile (Visitor View)`}
            </span>
            <span className="hidden text-zinc-400 sm:inline">·</span>
            <span className="hidden text-zinc-500 sm:inline">
              {isOwner
                ? 'Only you can edit and see private friend requests; no message button to self.'
                : 'Visitors see Add Friend, Message, and Invite to play; no Edit Profile.'}
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setPerspective('owner')}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                isOwner
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-900 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Owner View
            </button>
            <button
              type="button"
              onClick={() => setPerspective('visitor')}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                !isOwner
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-900 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Visitor View
            </button>
          </div>
        </div>

        {/* Banner */}
        <div className="relative mt-3 h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-black sm:h-64">
          <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
          <div className="absolute right-4 bottom-3 text-[11px] font-mono tracking-widest text-zinc-500 uppercase">
            [PROFILE BANNER]
          </div>
        </div>

        {/* Profile Info Header */}
        <div className="relative -mt-16 px-4 pb-6 sm:-mt-20 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar */}
            <div className="flex items-end gap-5">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-black text-3xl font-bold text-white shadow-xl dark:border-[#0a0a0c] sm:h-36 sm:w-36 sm:text-4xl">
                {avatarInitials}
              </div>
              <div className="mb-2 hidden sm:block">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">
                  {displayName}
                </h1>
                <p className="font-mono text-sm text-zinc-500">
                  @{username}
                </p>
              </div>
            </div>

            {/* Actions: Owner vs Visitor perspective */}
            <div className="flex items-center gap-2.5">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/profile/${username}`
                          : `/profile/${username}`
                      navigator.clipboard.writeText(url)
                      setCopiedProfileLink(true)
                      setTimeout(() => setCopiedProfileLink(false), 2000)
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {copiedProfileLink ? 'Link Copied!' : 'Share Profile'}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
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
                      <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            openEditModal()
                          }}
                          className="flex w-full items-center px-4 py-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Edit Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            handleSignOut()
                          }}
                          disabled={isLoggingOut}
                          className="flex w-full items-center px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          {isLoggingOut ? 'Signing out...' : 'Sign out'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFriendStatus(friendStatus === 'none' ? 'sent' : 'none')}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                      friendStatus === 'sent'
                        ? 'border border-zinc-300 bg-zinc-200 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
                    }`}
                  >
                    {friendStatus === 'sent' ? 'Request Sent' : 'Add Friend'}
                  </button>

                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                  >
                    Message
                  </button>

                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                    aria-label="More options"
                    title="More options"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Edit Profile Modal */}
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                    Edit Gamer Profile
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                  {editStatus && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-2.5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {editStatus}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                      Display Name (max 100 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                      Bio (max 300 chars)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={300}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Tell the community about what you play, squad preferences, etc."
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <span className="mt-1 block text-right text-[10px] text-zinc-400">
                      {editBio.length}/300
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">
                      Connected Gamer Handles
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          PSN ID
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={editPsn}
                          onChange={(e) => setEditPsn(e.target.value)}
                          placeholder="e.g. nightowl_kai"
                          className="mt-0.5 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Xbox Gamertag
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={editXbox}
                          onChange={(e) => setEditXbox(e.target.value)}
                          placeholder="e.g. NightOwl Kai"
                          className="mt-0.5 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Steam Username
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={editSteam}
                          onChange={(e) => setEditSteam(e.target.value)}
                          placeholder="e.g. nightowlkai"
                          className="mt-0.5 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Discord Handle
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={editDiscord}
                          onChange={(e) => setEditDiscord(e.target.value)}
                          placeholder="e.g. nightowl#1234"
                          className="mt-0.5 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Mobile Display Name & Bio */}
          <div className="mt-4 sm:hidden">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              {displayName}
            </h1>
            <p className="font-mono text-sm text-zinc-500">
              @{username}
            </p>
          </div>

          <div className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {bio ? (
              <p>{bio}</p>
            ) : isOwner ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-100/70 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                You haven&apos;t added a bio yet.{' '}
                <button
                  type="button"
                  onClick={openEditModal}
                  className="font-semibold text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                >
                  Click Edit Profile
                </button>{' '}
                to tell other gamers about your favorite games, squad style, and when you play.
              </div>
            ) : (
              <p className="text-xs italic text-zinc-400">This gamer has not added a bio yet.</p>
            )}
          </div>

          {/* Stats Bar: Friends, Friend Requests (owner only), Total Contributions */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span>
              <strong className="font-bold text-zinc-950 dark:text-white">{friendsCount}</strong> Friends
            </span>
            {isOwner && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <strong className="font-bold text-zinc-950 dark:text-white">{friendRequestsCount}</strong> Friend requests
                </span>
              </>
            )}
            <span>·</span>
            <span>
              <strong className="font-bold text-zinc-950 dark:text-white">{contributionsCount}</strong> Total contributions
            </span>
            <span>·</span>
            <span>Joined March 2026</span>
          </div>

          {/* Connect With Me - Gamer Tags with Copy buttons */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                CONNECT WITH ME
              </h2>
              {isOwner && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Edit Handles
                </button>
              )}
            </div>

            {Boolean(gamerTags.psn || gamerTags.xbox || gamerTags.steam || gamerTags.discord) ? (
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {/* PSN */}
                {gamerTags.psn && (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">PSN</span>
                    <span className="font-mono text-xs text-zinc-500">{gamerTags.psn}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('psn', gamerTags.psn!)}
                      className="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {copiedTag === 'psn' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Xbox */}
                {gamerTags.xbox && (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Xbox</span>
                    <span className="font-mono text-xs text-zinc-500">{gamerTags.xbox}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('xbox', gamerTags.xbox!)}
                      className="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {copiedTag === 'xbox' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Steam */}
                {gamerTags.steam && (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Steam</span>
                    <span className="font-mono text-xs text-zinc-500">{gamerTags.steam}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('steam', gamerTags.steam!)}
                      className="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {copiedTag === 'steam' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Discord */}
                {gamerTags.discord && (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-xs font-bold text-[#5865F2]">Discord</span>
                    <span className="font-mono text-xs text-zinc-500">{gamerTags.discord}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('discord', gamerTags.discord!)}
                      className="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {copiedTag === 'discord' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-xs italic text-zinc-400">
                {isOwner
                  ? 'No gamer tags connected yet. Click Edit Handles to link your PSN, Xbox, Steam, or Discord.'
                  : 'No gamer tags linked yet.'}
              </div>
            )}
          </div>
        </div>

        {/* 3. CURRENTLY PLAYING SECTION */}
        <div className="mt-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Currently playing
            </h2>
            <button
              type="button"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              See all games
            </button>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {games.map((game) => (
              <div
                key={game.title}
                className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
              >
                {/* Cover Placeholder */}
                <div className="flex h-32 w-full items-center justify-center bg-zinc-100 text-xs font-mono text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500">
                  [COVER ART]
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-zinc-950 truncate dark:text-white">
                    {game.title}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    {game.isPlayingNow && (
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {game.platform} · {game.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. MAIN TWO-COLUMN CONTENT */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT 2 COLUMNS: POSTS & CONTRIBUTIONS FEED */}
          <div className="lg:col-span-2">
            {/* Feed Tabs */}
            <div className="flex border-b border-zinc-200 text-sm font-medium dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`mr-6 pb-3 transition ${
                  activeTab === 'all'
                    ? 'border-b-2 border-zinc-950 font-semibold text-zinc-950 dark:border-white dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className={`mr-6 pb-3 transition ${
                  activeTab === 'posts'
                    ? 'border-b-2 border-zinc-950 font-semibold text-zinc-950 dark:border-white dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Posts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forums')}
                className={`mr-6 pb-3 transition ${
                  activeTab === 'forums'
                    ? 'border-b-2 border-zinc-950 font-semibold text-zinc-950 dark:border-white dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Forum contributions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`pb-3 transition ${
                  activeTab === 'media'
                    ? 'border-b-2 border-zinc-950 font-semibold text-zinc-950 dark:border-white dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Media
              </button>
            </div>

            {/* Posts Feed Items */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {/* Post 1 */}
              <article className="py-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                    {avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-zinc-950 dark:text-white">
                        {displayName}
                      </span>
                      <span className="text-xs text-zinc-500">
                        @{username} · 2h
                      </span>
                    </div>

                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        Elden Ring
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-200">
                      Finally beat Malenia on try 47. Bleed build with dual katanas carried me. Who else is still stuck on her?
                    </p>

                    {/* Screenshot / Clip placeholder */}
                    <div className="mt-3 flex h-64 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 font-mono text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-500">
                      [SCREENSHOT / CLIP]
                    </div>

                    {/* Engagement bar */}
                    <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
                      <button type="button" className="flex items-center gap-1.5 transition hover:text-zinc-800 dark:hover:text-zinc-300">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        24
                      </button>

                      <button type="button" className="flex items-center gap-1.5 transition hover:text-zinc-800 dark:hover:text-zinc-300">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        8
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleLike('post1')}
                        className={`flex items-center gap-1.5 transition ${
                          likes.post1.active ? 'text-rose-500 font-semibold' : 'hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill={likes.post1.active ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {likes.post1.count}
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              {/* Post 2: Forum Contribution */}
              <article className="py-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                    {avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Replied in <span className="font-medium text-zinc-800 dark:text-zinc-300">Helldivers 2</span> &gt; Strategy · 5h
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-200">
                      Running the 500kg bomb with the shield generator pack gives you enough survivability to clear heavy bug nests solo on Helldive difficulty. Pair it with the Breaker Incendiary.
                    </p>

                    {/* Engagement bar */}
                    <div className="mt-3 flex items-center gap-6 text-xs text-zinc-500">
                      <button type="button" className="flex items-center gap-1.5 transition hover:text-zinc-800 dark:hover:text-zinc-300">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        12
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleLike('post2')}
                        className={`flex items-center gap-1.5 transition ${
                          likes.post2.active ? 'text-rose-500 font-semibold' : 'hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill={likes.post2.active ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {likes.post2.count}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          {/* RIGHT COLUMN: GAMER STATUS & CIRCLES SIDEBAR */}
          <div className="space-y-6">
            {/* GAMER STATUS CARD */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                Gamer status
              </h2>

              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                <span className={`h-2.5 w-2.5 rounded-full ${gamerStatus.is_online ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                <span>{gamerStatus.is_online ? 'Online' : 'Offline'}</span>
                {gamerStatus.current_game && (
                  <span className="text-zinc-400">· in {gamerStatus.current_game}</span>
                )}
              </div>

              {/* CONNECTION TAGS */}
              <div className="mt-4">
                <p className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  CONNECTION TAGS
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {connectionTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        selectedTag === tag
                          ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                          : 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status details */}
              <dl className="mt-5 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Usually on</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-200">{gamerStatus.usually_on || '9pm – 1am ET'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Mic</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-200">{gamerStatus.mic || 'Yes'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Playstyle</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-200">{gamerStatus.playstyle || 'Co-op, chill'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Region</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-200">{gamerStatus.region || 'NA East'}</dd>
                </div>
              </dl>

              {isOwner ? (
                <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Your status: Visible to friends</span>
                  </div>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="font-semibold text-zinc-900 underline hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setInviteSent(!inviteSent)}
                  className={`mt-5 w-full rounded-full py-2 text-xs font-semibold transition ${
                    inviteSent
                      ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border border-zinc-300 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {inviteSent ? '✓ Game Invite Sent' : 'Invite to play'}
                </button>
              )}
            </div>

            {/* CIRCLES CARD */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Circles
                </h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  See all
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                {circles.map((circle) => (
                  <div key={circle.name} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {circle.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-900 truncate dark:text-zinc-100">
                        {circle.name}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {circle.visibility} · {circle.members}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer padding */}
        <div className="h-16" />
      </div>
    </div>
  )
}
