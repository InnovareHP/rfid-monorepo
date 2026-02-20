import { rateTicket } from "@/services/support/support-service";
import type { TicketRating } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dashboard/ui/components/dialog";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RatingDialogProps {
  ticketId: string;
  existingRating?: TicketRating | null;
}

export function RatingDialog({ ticketId, existingRating }: RatingDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(existingRating?.rating ?? 0);
  const [comment, setComment] = useState(existingRating?.comment ?? "");

  const mutation = useMutation({
    mutationFn: () => rateTicket(ticketId, selected, comment || undefined),
    onSuccess: () => {
      toast.success(
        existingRating ? "Rating updated" : "Thank you for your feedback!"
      );
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      setOpen(false);
    },
    onError: () => toast.error("Failed to submit rating"),
  });

  const displayed = hovered || selected;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 w-full">
          <Star className="h-4 w-4" />
          {existingRating ? "Update rating" : "Rate this ticket"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate your experience</DialogTitle>
          <DialogDescription>
            How satisfied were you with the support you received?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Stars */}
          <div className="flex gap-1 pb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(star)}
                className="p-1 transition-transform focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= displayed
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Any additional comments? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none w-full"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={selected === 0 || mutation.isPending}
          >
            {mutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
