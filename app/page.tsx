import { getCurrentUserProfile } from '@/lib/profile/queries'
import { createClient } from '@/lib/supabase/server'
import HomeContent, { type HomePost, type HomeViewer } from './home-content'

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: Promise<{
    preview?: string
  }>
}

// The fake signed-in preview is for testing, so it only works locally and on
// Vercel preview deployments. On the live site the parameter is ignored.
const PREVIEW_ALLOWED =
  process.env.NODE_ENV === 'development' ||
  process.env.VERCEL_ENV === 'preview'

export default async function Home({ searchParams }: HomePageProps) {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )

  if (!configured) {
    return (
      <HomeContent
        communities={[]}
        posts={[]}
        dataState="unconfigured"
        viewer={null}
      />
    )
  }

  const { preview } = await searchParams
  const isPreviewSignedIn =
    PREVIEW_ALLOWED &&
    (preview === 'signed-in' || preview === 'owner' || preview === 'true')

  const profile = await getCurrentUserProfile(isPreviewSignedIn)
  const viewer: HomeViewer | null = profile
    ? { displayName: profile.display_name || profile.username || 'Gamer' }
    : null

  const supabase = await createClient()
  const [communityResult, postResult] = await Promise.all([
    supabase
      .from('communities')
      .select('id, name, description')
      .order('created_at', { ascending: false })
      .limit(12),

    // NSFW and spoiler posts stay out of the public feed until the blur from
    // issue #10 exists, since nothing here could hide them.
    // posts also reach profiles through post_votes, so name the author link.
    supabase
      .from('posts')
      .select(
        'id, title, content, created_at, upvote_count, image_path, profiles!posts_author_id_fkey(username)'
      )
      .eq('is_nsfw', false)
      .eq('is_spoiler', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const posts: HomePost[] = (postResult.data ?? []).map(
    ({ image_path, profiles, ...post }) => ({
      ...post,
      authorUsername: profiles?.username ?? null,
      imageUrl: image_path
        ? supabase.storage.from('post-images').getPublicUrl(image_path).data
            .publicUrl
        : null,
    })
  )

  return (
    <HomeContent
      communities={communityResult.data ?? []}
      posts={posts}
      dataState={communityResult.error || postResult.error ? 'error' : 'ready'}
      viewer={viewer}
    />
  )
}
