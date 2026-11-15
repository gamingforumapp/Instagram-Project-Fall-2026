// The columns every comment query loads, with the author's public profile.
// Server and browser code both use this, so the file has no server imports.
// Passing it to .select() lets Supabase type the result, so no casts are needed.
export const COMMENT_WITH_AUTHOR =
  "id, post_id, author_id, parent_comment_id, content, created_at, updated_at, deleted_at, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url)";
