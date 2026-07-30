import type { TaskCommentDto } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Button } from "@dashboard/ui/components/button";
import { Textarea } from "@dashboard/ui/components/textarea";
import { formatDateTime } from "@dashboard/shared";
import { Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "../confirmation-dialog";

type CommentsSectionProps = {
  comments: TaskCommentDto[];
  ownMemberId: string | null;
  isLoading?: boolean;
  submitting?: boolean;
  onAdd: (body: string) => void;
  onEdit: (commentId: string, body: string) => void;
  onDelete: (commentId: string) => void;
};

export const CommentsSection = ({
  comments,
  ownMemberId,
  isLoading,
  submitting,
  onAdd,
  onEdit,
  onDelete,
}: CommentsSectionProps) => {
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!body.trim()) return;
    onAdd(body.trim());
    setBody("");
  };

  const handleSaveEdit = () => {
    if (!editingId || !editBody.trim()) return;
    onEdit(editingId, editBody.trim());
    setEditingId(null);
    setEditBody("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No comments yet
        </p>
      )}

      {comments.map((comment) => {
        const isOwn =
          comment.memberId === ownMemberId && !comment.id.startsWith("temp-");
        return (
          <div key={comment.id} className="flex gap-3 group">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={comment.author.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {comment.author.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(comment.createdAt)}
                </span>
                {isOwn && editingId !== comment.id && (
                  <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditBody(comment.body);
                      }}
                      aria-label="Edit comment"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      onClick={() => setDeletingId(comment.id)}
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </span>
                )}
              </div>
              {editingId === comment.id ? (
                <div className="mt-1 space-y-2">
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">
                  {comment.body}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a comment..."
          rows={2}
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={submitting || !body.trim()}
          aria-label="Send comment"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmationDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        title="Delete comment?"
        description="This comment will be removed. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingId) onDelete(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
};
