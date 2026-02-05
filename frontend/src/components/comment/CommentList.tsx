"use client";

import { useState, useEffect } from "react";
import { getArticleComments, createComment } from "@/lib/api/comments";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Comment } from "@/types";

interface CommentListProps {
  articleId: number;
}

export function CommentList({ articleId }: CommentListProps) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchComments = async () => {
    try {
      const res = await getArticleComments(articleId);
      if (res.success && res.data) {
        setComments(res.data);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [articleId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await createComment(articleId, { content: newComment });
      if (res.success) {
        setNewComment("");
        fetchComments();
      } else {
        setError(res.message || "留言失敗");
      }
    } catch {
      setError("發送留言失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await createComment(articleId, {
        content: replyContent,
        parentId,
      });
      if (res.success) {
        setReplyContent("");
        setReplyTo(null);
        fetchComments();
      } else {
        setError(res.message || "回覆失敗");
      }
    } catch {
      setError("發送回覆失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <div>
      <h3 className="text-lg font-heading font-semibold text-text mb-6 flex items-center gap-3">
        <span className="text-primary font-mono">{"//"}</span>
        {"留言"}
        <span className="text-sm font-normal text-text-muted font-mono">
          ({totalComments})
        </span>
      </h3>

      {/* Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-sm text-primary font-mono flex-shrink-0">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input min-h-[100px] resize-none"
                placeholder="分享你的想法..."
                disabled={isSubmitting}
              />
              {error && (
                <p className="text-sm text-red-400 mt-2">{error}</p>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary text-sm"
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? "發送中..." : "發送留言"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 card text-center py-6">
          <p className="text-text-muted text-sm">
            <a href="/login" className="text-primary hover:underline">
              登入
            </a>
            {" "}後即可留言
          </p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-surface" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface rounded w-1/4" />
                <div className="h-3 bg-surface rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-muted text-sm">尚無留言，成為第一個留言的人吧</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isAuthenticated={isAuthenticated}
              isSubmitting={isSubmitting}
              replyTo={replyTo}
              replyContent={replyContent}
              onReplyToChange={setReplyTo}
              onReplyContentChange={setReplyContent}
              onSubmitReply={handleSubmitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  replyTo: number | null;
  replyContent: string;
  onReplyToChange: (id: number | null) => void;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (parentId: number) => void;
}

function CommentItem({
  comment,
  isAuthenticated,
  isSubmitting,
  replyTo,
  replyContent,
  onReplyToChange,
  onReplyContentChange,
  onSubmitReply,
}: CommentItemProps) {
  return (
    <div className="group">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-sm text-secondary-300 font-mono flex-shrink-0">
          {comment.user.displayName?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-text">
              {comment.user.displayName}
            </span>
            <span className="text-xs text-text-muted font-mono">
              {new Date(comment.createdAt).toLocaleDateString("zh-TW")}
            </span>
          </div>
          <p className="text-sm text-text leading-relaxed">{comment.content}</p>
          {isAuthenticated && (
            <button
              onClick={() =>
                onReplyToChange(replyTo === comment.id ? null : comment.id)
              }
              className="text-xs text-text-muted hover:text-primary mt-2 transition-colors"
            >
              {replyTo === comment.id ? "取消回覆" : "回覆"}
            </button>
          )}

          {/* Reply Form */}
          {replyTo === comment.id && (
            <div className="mt-3 pl-4 border-l-2 border-primary/30">
              <textarea
                value={replyContent}
                onChange={(e) => onReplyContentChange(e.target.value)}
                className="input min-h-[80px] resize-none text-sm"
                placeholder="寫下你的回覆..."
                disabled={isSubmitting}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => onReplyToChange(null)}
                  className="btn btn-ghost text-xs"
                >
                  取消
                </button>
                <button
                  onClick={() => onSubmitReply(comment.id)}
                  className="btn btn-primary text-xs"
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  送出回覆
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4 pl-4 border-l border-border">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs text-text-muted font-mono flex-shrink-0">
                    {reply.user.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-text">
                        {reply.user.displayName}
                      </span>
                      <span className="text-xs text-text-muted font-mono">
                        {new Date(reply.createdAt).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    <p className="text-sm text-text leading-relaxed">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
