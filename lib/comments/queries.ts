import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor, CommentThreadItem } from "@/types/comments";

export async function getCommentsForPost(
  postId: string
): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      id,
      post_id,
      author_id,
      parent_comment_id,
      content,
      created_at,
      updated_at,
      deleted_at,
      author:profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as unknown as CommentWithAuthor[];
}

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
