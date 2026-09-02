import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Copy } from "lucide-react";
import { toast } from "sonner";

// The snippet is plain HTML so it pastes into any site builder. The listener is
// optional: without it the iframe keeps its fallback height.
const buildSnippet = (embedUrl: string) => `<iframe
  src="${embedUrl}"
  title="Book a meeting"
  width="100%"
  height="820"
  style="border:0;max-width:100%"
  loading="lazy"
></iframe>
<script>
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "refidly:embed:height") {
      var frame = document.querySelector('iframe[src="${embedUrl}"]');
      if (frame) frame.style.height = event.data.height + "px";
    }
  });
</script>`;

export const BookingEmbedCard = ({ embedUrl }: { embedUrl: string }) => {
  const snippet = buildSnippet(embedUrl);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    toast.success("Embed code copied");
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Embed On Your Site</p>
            <p className="text-sm text-muted-foreground">
              Paste this where the booking form should appear. It resizes itself
              as visitors move through the steps.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy code
          </Button>
        </div>

        <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs">
          <code>{snippet}</code>
        </pre>
      </CardContent>
    </Card>
  );
};
