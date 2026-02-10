import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support/$id")({
  component: SupportPage,
});

function SupportPage() {
  const { id } = Route.useParams();

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Support</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            Dynamic segment: <code>{id}</code>
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
