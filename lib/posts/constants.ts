// These match the checks on public.posts and the post-images bucket.
export const MAX_TITLE_LENGTH = 200
export const MAX_CONTENT_LENGTH = 40000
export const MAX_IMAGE_BYTES = 5242880

export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
