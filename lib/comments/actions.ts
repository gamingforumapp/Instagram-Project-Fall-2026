"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor } from "@/types/comments";

export interface AddCommentResult {
  data?: CommentWithAuthor;
  error?: string;
}

export async function addComment(
  postId: string,
  content: string,
  parentCommentId?: string | null
): Promise<AddCommentResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Comment cannot be empty." };
  }

  if (trimmed.length > 10000) {
    return { error: "Comment cannot exceed 10,000 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to post a comment." };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      content: trimmed,
      parent_comment_id: parentCommentId ?? null,
    })
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
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to add comment." };
  }

  revalidatePath(`/posts/${postId}`);
  return { data: data as unknown as CommentWithAuthor };
}

export async function deleteComment(
  commentId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to delete a comment." };
  }

  // Soft delete per database constraint: comments_deleted_have_no_text (content = '', deleted_at is not null)
  const { error } = await supabase
    .from("comments")
    .update({
      content: "",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/posts/${postId}`);
  return { success: true };
}
