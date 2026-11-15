import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor } from "@/types/comments";
import { COMMENT_WITH_AUTHOR } from "@/lib/comments/select";

export async function getCommentsForPost(
  postId: string
): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_WITH_AUTHOR)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}
