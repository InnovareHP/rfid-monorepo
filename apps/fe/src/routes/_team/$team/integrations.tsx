import IntegrationPage from "@/components/integrations/integration-page";
import {
  isIntegrationTab,
  type IntegrationTab,
} from "@/components/integrations/integration-tabs";
import { createFileRoute } from "@tanstack/react-router";

// Every key is optional, not just undefined-able: a required key would force
// `search` onto every existing link to this page.
interface IntegrationSearch {
  tab?: IntegrationTab;
  gmail?: string;
  outlook?: string;
  google_calendar?: string;
  outlook_calendar?: string;
}

export const Route = createFileRoute("/_team/$team/integrations")({
  // The page decides which tab an absent value means, so the provider redirect
  // params stay part of the schema rather than being read loosely.
  validateSearch: (search: Record<string, unknown>): IntegrationSearch => ({
    tab: isIntegrationTab(search.tab) ? search.tab : undefined,
    gmail: (search.gmail as string) || undefined,
    outlook: (search.outlook as string) || undefined,
    google_calendar: (search.google_calendar as string) || undefined,
    outlook_calendar: (search.outlook_calendar as string) || undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <IntegrationPage />;
}
