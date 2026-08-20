import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

type FeatureLockedProps = {
  title: string;
  description: string;
  team: string;
};

// Shown where a gated page would otherwise render. A plan that cannot reach a
// feature gets the reason and the way out, never an empty screen or an error.
export function FeatureLocked({
  title,
  description,
  team,
}: FeatureLockedProps) {
  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="rounded-full bg-muted p-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </span>

        <div className="space-y-1">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Button asChild>
          <Link to="/$team/plans" params={{ team }}>
            View plans
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
