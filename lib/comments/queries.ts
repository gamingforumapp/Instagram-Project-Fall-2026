import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor } from "@/types/comments";

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
