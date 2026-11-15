import type { CommentWithAuthor, CommentThreadItem } from "@/types/comments";

// Kept apart from queries.ts, which uses the server Supabase client, because the
// browser-side usePostComments hook needs this too.

export function nestCommentThreads(
  comments: CommentWithAuthor[]
): CommentThreadItem[] {
  const map = new Map<string, CommentThreadItem>();
  const roots: CommentThreadItem[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const item = map.get(c.id)!;
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies!.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}
