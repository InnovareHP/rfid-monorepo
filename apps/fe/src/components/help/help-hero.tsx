import type { ManualCategory } from "@/services/manual/manual-service";
import { Button } from "@dashboard/ui/components/button";
import { Link } from "@tanstack/react-router";
import { HelpSearchInput } from "./help-search-input";

const HERO_BACKGROUND = "/branding/Help/help-hero-bg.png";
const HERO_MASCOT = "/branding/Mascot/help-mascot.png";

export function HelpHero({
  team,
  search,
  onSearchChange,
  topics,
}: {
  team: string;
  search: string;
  onSearchChange: (value: string) => void;
  topics: ManualCategory[];
}) {
  return (
    <section
      className="relative overflow-hidden rounded-xl bg-brand-surface bg-cover bg-center px-6 py-10 sm:px-10"
      style={{ backgroundImage: `url(${HERO_BACKGROUND})` }}
    >
      <div className="relative z-10 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-brand sm:text-4xl">
          How can we help?
        </h1>
        <p className="mt-2 text-brand-ink">
          Find answers quickly, troubleshoot issues, and contact support.
        </p>

        <HelpSearchInput
          value={search}
          onChange={onSearchChange}
          className="mt-6"
        />

        {topics.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-brand-ink">Popular topics:</span>
            {topics.map((topic) => (
              <Button key={topic.id} variant="outline" size="sm" asChild>
                <Link
                  to="/$team/help/$categorySlug"
                  params={{ team, categorySlug: topic.slug }}
                >
                  {topic.name}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      <img
        src={HERO_MASCOT}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-6 hidden h-[280px] w-[323px] object-contain lg:block"
      />
    </section>
  );
}
