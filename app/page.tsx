import Link from 'next/link'
import { getCurrentUserProfile } from '@/lib/profile/queries'

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams?: Promise<{
    preview?: string
  }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const preview = resolvedParams?.preview
  const isPreviewSignedIn = preview === 'signed-in' || preview === 'owner' || preview === 'true'

  const profile = await getCurrentUserProfile(isPreviewSignedIn)

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          Faction Social Platform
        </span>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          {profile
            ? `Welcome back, ${profile.display_name || profile.username}!`
            : 'A Social Hub for Gamers'}
        </h1>
        <p className="mx-auto max-w-md text-base text-zinc-600 dark:text-zinc-400">
          {profile
            ? 'Jump straight into your gamer profile, connect with friends, and show off your game library.'
            : 'Share posts and clips, review and discover games, and find people to play with.'}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {profile ? (
          <Link
            href="/profile"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500"
          >
            Go to Your Profile
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Log In
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
