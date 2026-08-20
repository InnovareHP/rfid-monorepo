import type { ManualCategory } from "@/services/manual/manual-service";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { memo } from "react";

export const HelpCategoryCard = memo(function HelpCategoryCard({
  team,
  category,
}: {
  team: string;
  category: ManualCategory;
}) {
  return (
    <Link
      to="/$team/help/$categorySlug"
      params={{ team, categorySlug: category.slug }}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-2 p-6">
          <h3 className="text-xl font-semibold text-primary">
            {category.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {category.description}
          </p>
          <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-bold text-primary">
            Learn More
            <ArrowRight className="size-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
});
