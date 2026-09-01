import { linkTarget, linkTargetCreateHref } from "@/lib/helper/link-target";
import { ExternalLink } from "lucide-react";

type LinkTargetEmptyProps = {
  // The module the link field points at, e.g. LEAD for a referral's Facility.
  targetModule: string;
  team: string;
  // What the user typed, so the message names the thing they looked for.
  search: string;
  fieldLabel: string;
};

// A link field can only choose records that already exist, so an empty result
// is a dead end unless it says where to create one. Opens in a new tab: the
// record being filled in here is usually half-finished.
export function LinkTargetEmpty({
  targetModule,
  team,
  search,
  fieldLabel,
}: LinkTargetEmptyProps) {
  const target = linkTarget(targetModule);
  const href = linkTargetCreateHref(targetModule, team);

  if (!target || !href) {
    return (
      <span className="text-sm text-muted-foreground">
        No {fieldLabel.toLowerCase()} found.
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 px-3 py-4 text-center">
      <p className="text-sm text-muted-foreground">
        {search.trim()
          ? `No ${fieldLabel.toLowerCase()} matching "${search.trim()}".`
          : `No ${fieldLabel.toLowerCase()} yet.`}
      </p>
      <p className="text-xs text-muted-foreground">
        It has to exist in {target.label} before it can be linked here.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        Add it in {target.label}
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
