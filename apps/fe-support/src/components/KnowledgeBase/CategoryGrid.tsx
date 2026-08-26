import { manualIcon } from "@/lib/manual-icons";
import { getPublishedCategories } from "@/services/manual/manual-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ManualCard } from "./ManualCard";

// Eight tints, cycled by position, so a new category gets a colour without an
// editor having to pick one.
const TINTS = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
  "bg-avatar-8",
];

export function CategoryGrid({ lang }: { lang: string }) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["manual-categories"],
    queryFn: getPublishedCategories,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No articles have been published yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {categories.map((category, index) => {
        const count = category._count?.articles ?? 0;

        return (
          <ManualCard
            key={category.id}
            to="/$lang/manual/$categorySlug"
            params={{ lang, categorySlug: category.slug }}
            icon={manualIcon(category.icon)}
            iconBg={TINTS[index % TINTS.length]}
            title={category.name}
            description={category.description}
            meta={
              <p className="text-xs text-muted-foreground">
                {count} {count === 1 ? "article" : "articles"}
              </p>
            }
          />
        );
      })}
    </div>
  );
}
