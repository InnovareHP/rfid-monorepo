import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getPublishedArticles } from "@/services/manual/manual-service";
import { Input } from "@dashboard/ui/components/input";
import { SEARCH_PLACEHOLDER } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

const MIN_QUERY_LENGTH = 2;

export function ManualSearch({ lang }: { lang: string }) {
  const [term, setTerm] = useState("");
  const query = useDebouncedValue(term.trim());
  const enabled = query.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ["manual-search", query],
    queryFn: () => getPublishedArticles({ search: query, limit: 8 }),
    enabled,
  });

  return (
    <div className="space-y-3">
      <div className="relative flex items-center">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={SEARCH_PLACEHOLDER}
          className="h-11 rounded-lg border border-border bg-background pl-4 pr-10"
        />

        {isFetching ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      {enabled && !isFetching && data?.articles.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing matches "{query}". Try a different word, or ask the assistant.
        </p>
      )}

      {enabled && data && data.articles.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {data.articles.map((article) => (
            <li key={article.id}>
              <Link
                to="/$lang/manual/article/$slug"
                params={{ lang, slug: article.slug }}
                className="block px-4 py-3 transition-colors hover:bg-muted"
              >
                <p className="text-sm font-medium text-foreground">
                  {article.title}
                </p>

                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {article.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
