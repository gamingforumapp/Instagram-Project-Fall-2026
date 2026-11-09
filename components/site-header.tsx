import Link from 'next/link'
import { Crest } from '@/components/crest'
import { LogoutButton } from '@/components/logout-button'

interface SiteHeaderProps {
  active: 'communities'
  /** The signed-in user, or null for a visitor. */
  viewer: { displayName: string } | null
}

/**
 * Header for the community pages, styled to match the homepage header.
 * The homepage still has its own copy in app/home-content.tsx.
 * Search is left out: it isn't built yet.
 */
export function SiteHeader({ active, viewer }: SiteHeaderProps) {
  return (
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
          <Link
            href="/communities"
            className={
              active === 'communities'
                ? 'text-[#e9b74e]'
                : 'text-zinc-400 hover:text-white'
            }
          >
            Communities
          </Link>

          {viewer ? (
            <>
              <Link
                href="/profile"
                className="max-w-40 truncate rounded-lg border border-[#30343b] px-3 py-2 hover:bg-[#171b22]"
              >
                {viewer.displayName}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-[#30343b] px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#e9b74e] px-3 py-2 font-semibold text-black"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
