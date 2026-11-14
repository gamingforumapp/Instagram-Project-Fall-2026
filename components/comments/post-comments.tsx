"use client";

import { useState } from "react";
import Link from "next/link";
import { usePostComments } from "@/lib/hooks/usePostComments";
import type { CommentWithAuthor, CommentThreadItem } from "@/types/comments";

interface PostCommentsProps {
  postId: string;
  initialComments?: CommentWithAuthor[];
  currentUserId?: string | null;
}

export function PostComments({
  postId,
  initialComments = [],
  currentUserId,
}: PostCommentsProps) {
  const { thread, loading, error, addComment, deleteComment } =
    usePostComments(postId, initialComments);

  const [topLevelContent, setTopLevelContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleTopLevelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topLevelContent.trim() || submitting) return;

    if (!currentUserId) {
      setSubmitError("You must be logged in to leave a comment.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await addComment(topLevelContent.trim(), null);
      setTopLevelContent("");
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to post comment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Comments
        </h2>
        <span className="text-sm text-zinc-400">
          {thread.length} {thread.length === 1 ? "thread" : "threads"}
        </span>
      </div>

      {/* Top-level comment box */}
      {currentUserId ? (
        <form onSubmit={handleTopLevelSubmit} className="space-y-3">
          <textarea
            value={topLevelContent}
            onChange={(e) => setTopLevelContent(e.target.value)}
            rows={3}
            placeholder="Share your thoughts on this clip or post..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {submitError && (
            <p className="text-xs text-red-400">{submitError}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !topLevelContent.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting..." : "Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
          <p className="text-sm text-zinc-400">
            <Link
              href="/login"
              className="font-medium text-indigo-400 hover:underline"
            >
              Log in
            </Link>{" "}
            or{" "}
            <Link
              href="/signup"
              className="font-medium text-indigo-400 hover:underline"
            >
              sign up
            </Link>{" "}
            to join the discussion.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Failed to load comments: {error}</p>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading && thread.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading comments...</p>
        ) : thread.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No comments yet. Be the first to start the discussion!
          </p>
        ) : (
          thread.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={addComment}
              onDelete={deleteComment}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface CommentItemProps {
  comment: CommentThreadItem;
  currentUserId?: string | null;
  onReply: (
    content: string,
    parentId?: string | null
  ) => Promise<CommentWithAuthor | undefined>;
  onDelete: (commentId: string) => Promise<void>;
  depth?: number;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  depth = 0,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUserId && comment.author_id === currentUserId;
  const isDeleted = comment.deleted_at !== null;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submittingReply) return;

    setSubmittingReply(true);
    setReplyError(null);
    try {
      await onReply(replyContent.trim(), comment.id);
      setReplyContent("");
      setIsReplying(false);
    } catch (err: unknown) {
      setReplyError(
        err instanceof Error ? err.message : "Failed to post reply."
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`space-y-3 ${
        depth > 0
          ? "ml-4 border-l-2 border-zinc-800 pl-4 sm:ml-6 sm:pl-6"
          : "border-b border-zinc-900 pb-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {comment.author?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.author.avatar_url}
              alt={comment.author.display_name || "User"}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
              {(
                comment.author?.display_name?.[0] ||
                comment.author?.username?.[0] ||
                "?"
              ).toUpperCase()}
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-zinc-200">
              {isDeleted
                ? "[deleted]"
                : comment.author?.display_name ||
                  comment.author?.username ||
                  "Anonymous"}
            </span>
            {comment.author?.username && !isDeleted && (
              <span className="ml-1.5 text-xs text-zinc-500">
                @{comment.author.username}
              </span>
            )}
            <span className="ml-2 text-xs text-zinc-500">
              {new Date(comment.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {isAuthor && !isDeleted && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-zinc-500 hover:text-red-400 transition"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      <div className="text-sm leading-relaxed text-zinc-300">
        {isDeleted ? (
          <em className="text-xs text-zinc-500">[Comment deleted by author]</em>
        ) : (
          <p className="whitespace-pre-line">{comment.content}</p>
        )}
      </div>

      {!isDeleted && currentUserId && (
        <div>
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs font-medium text-zinc-400 hover:text-indigo-400 transition"
          >
            {isReplying ? "Cancel" : "Reply"}
          </button>
        </div>
      )}

      {isReplying && (
        <form onSubmit={handleReplySubmit} className="space-y-2 pt-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
            placeholder="Write a reply..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/90 p-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {replyError && <p className="text-xs text-red-400">{replyError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsReplying(false)}
              className="rounded px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReply || !replyContent.trim()}
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submittingReply ? "Posting..." : "Reply"}
            </button>
          </div>
        </form>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PostComments;
