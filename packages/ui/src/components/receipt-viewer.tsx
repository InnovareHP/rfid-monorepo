import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

type ReceiptViewerProps = {
  url: string;
  label?: string;
};

export function ReceiptViewer({
  url,
  label = "View Receipt",
}: ReceiptViewerProps) {
  if (!url) return null;

  return (
    <Dialog>
      {/* Thumbnail / Button */}
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="cursor-pointer p-2 hover:bg-muted"
        >
          {label}
        </Button>
      </DialogTrigger>

      {/* Full View */}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center">
          <img
            src={url}
            alt="Receipt full view"
            className="max-h-[80vh] w-full rounded-md object-contain"
          />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.open(url, "_blank")}>
            Open in new tab
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
