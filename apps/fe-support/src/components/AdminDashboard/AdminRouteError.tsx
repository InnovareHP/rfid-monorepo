import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

// Keeps a failed admin query inside the sidebar shell instead of letting it
// bubble to the root boundary and blank the whole app.
export function AdminRouteError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive h-6 w-6" />
          </div>
          <CardTitle>This page could not load</CardTitle>
          <CardDescription className="mt-2">
            {error.message || "The request failed. Try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.invalidate()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
