import type { Tables } from "@/lib/database.types";

export type CommentRow = Tables<"comments">;
export type ProfileRow = Tables<"profiles">;

export interface CommentAuthor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CommentWithAuthor extends CommentRow {
  author: CommentAuthor | null;
}

export interface CommentThreadItem extends CommentWithAuthor {
  replies?: CommentThreadItem[];
}
