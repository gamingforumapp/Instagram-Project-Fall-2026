"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { nestCommentThreads } from "@/lib/comments/queries";
import {
  addComment as serverAddComment,
  deleteComment as serverDeleteComment,
} from "@/lib/comments/actions";
import type { CommentWithAuthor } from "@/types/comments";

export function usePostComments(
  postId: string,
  initialComments: CommentWithAuthor[] = []
) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await supabase
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

    if (fetchErr) {
      setError(fetchErr.message);
    } else if (data) {
      setComments(data as unknown as CommentWithAuthor[]);
    }
    setLoading(false);
  }, [postId, supabase]);

  useEffect(() => {
    if (!postId) return;

    let isMounted = true;

    // Fetch initial comments if not supplied
    if (initialComments.length === 0) {
      supabase
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
        .order("created_at", { ascending: true })
        .then(({ data, error: fetchErr }) => {
          if (!isMounted) return;
          if (fetchErr) {
            setError(fetchErr.message);
          } else if (data) {
            setComments(data as unknown as CommentWithAuthor[]);
          }
        });
    }

    const channel = supabase
      .channel(`realtime:comments:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as CommentWithAuthor;
            if (newRow.author_id) {
              const { data: author } = await supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url")
                .eq("id", newRow.author_id)
                .single();
              newRow.author = author;
            } else {
              newRow.author = null;
            }

            setComments((prev) => {
              if (prev.some((c) => c.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as Partial<CommentWithAuthor>;
            setComments((prev) =>
              prev.map((c) =>
                c.id === updatedRow.id
                  ? {
                      ...c,
                      content: updatedRow.content ?? c.content,
                      deleted_at: updatedRow.deleted_at ?? c.deleted_at,
                      updated_at: updatedRow.updated_at ?? c.updated_at,
                    }
                  : c
              )
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setComments((prev) => prev.filter((c) => c.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [postId, supabase, initialComments.length]);

  const handleAddComment = async (
    content: string,
    parentCommentId?: string | null
  ) => {
    const res = await serverAddComment(postId, content, parentCommentId);
    if (res.error) {
      throw new Error(res.error);
    }
    if (res.data) {
      setComments((prev) => {
        if (prev.some((c) => c.id === res.data!.id)) return prev;
        return [...prev, res.data!];
      });
    }
    return res.data;
  };

  const handleDeleteComment = async (commentId: string) => {
    const res = await serverDeleteComment(commentId, postId);
    if (!res.success) {
      throw new Error(res.error || "Failed to delete comment");
    }
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, content: "", deleted_at: new Date().toISOString() }
          : c
      )
    );
  };

  const thread = useMemo(() => nestCommentThreads(comments), [comments]);

  return {
    comments,
    thread,
    loading,
    error,
    addComment: handleAddComment,
    deleteComment: handleDeleteComment,
    refetch: fetchComments,
  };
}
