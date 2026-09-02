import type { NavItem } from "@/components/side-bar/nav-main";
import type { LucideIcon } from "lucide-react";

export type NavSearchEntry = {
  title: string;
  section: string;
  url: string;
  icon?: LucideIcon;
  haystack: string;
};

const ROOT_SECTION = "General";

// Lowercasing happens once here, not once per item per keystroke.
export function flattenNavItems(items: NavItem[]): NavSearchEntry[] {
  const entries: NavSearchEntry[] = [];
  const seen = new Set<string>();

  const push = (
    title: string,
    section: string,
    url: string,
    icon?: LucideIcon
  ) => {
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({
      title,
      section,
      url,
      icon,
      haystack: `${section} ${title}`.toLowerCase(),
    });
  };

  for (const item of items) {
    if (item.url) push(item.title, ROOT_SECTION, item.url, item.icon);

    for (const subItem of item.items ?? []) {
      push(subItem.title, item.title, subItem.url, subItem.icon);

      for (const child of subItem.items ?? []) {
        push(child.title, subItem.title, child.url, child.icon);
      }
    }
  }

  return entries;
}

// Earlier match wins, an exact title prefix wins outright.
export function searchNavEntries(
  entries: NavSearchEntry[],
  query: string,
  limit = 8
): NavSearchEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries.slice(0, limit);

  const scored: { entry: NavSearchEntry; score: number }[] = [];

  for (const entry of entries) {
    const index = entry.haystack.indexOf(needle);
    if (index === -1) continue;
    scored.push({
      entry,
      score: entry.title.toLowerCase().startsWith(needle) ? -1 : index,
    });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((match) => match.entry);
}
