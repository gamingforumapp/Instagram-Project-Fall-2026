import { Crest } from '@/components/crest'

interface SiteFooterProps {
  /** The signed-in user, or null for a visitor. */
  viewer: { displayName: string } | null
}

/**
 * Footer styled to match the homepage footer.
 * The homepage still has its own copy in app/home-content.tsx.
 */
export function SiteFooter({ viewer }: SiteFooterProps) {
  return (
    <footer className="mt-10 border-t border-[#1e2228] px-5 py-7">
      <div className="mx-auto flex max-w-6xl justify-between text-sm">
        <span className="font-bold text-[#e9c980]">
          <Crest size={20} className="mr-1.5 inline-block align-text-bottom" />
          FACTION{' '}
          <span className="ml-3 font-normal text-zinc-500">
            Play better, together.
          </span>
        </span>
        {!viewer && <span className="text-zinc-500">◎ Browsing as a guest</span>}
      </div>
    </footer>
  )
}
