import { getCounties } from "@/services/referral/referral-service";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@dashboard/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Users } from "lucide-react";

// One shared read for the whole board: every county cell reads the same cached
// configuration rather than fetching its own liaisons per row.
export function CountyLiaisonsHint({ county }: { county: string }) {
  const { team } = useParams({ strict: false });

  const { data: counties } = useQuery({
    queryKey: ["county-configuration"],
    queryFn: getCounties,
    staleTime: 1000 * 60 * 5,
  });

  if (!county || !team) return null;

  const liaisons = counties?.find((c) => c.name === county)?.liaisons ?? [];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/$team/county-config"
          params={{ team }}
          // The cell opens an editor on click, which is not what this link means.
          onClick={(event) => event.stopPropagation()}
          aria-label={`Liaisons assigned to ${county}`}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Users className="size-3.5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{county}</p>
        <p>
          {liaisons.length > 0
            ? liaisons.join(", ")
            : "No liaison assigned — open county configuration"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
