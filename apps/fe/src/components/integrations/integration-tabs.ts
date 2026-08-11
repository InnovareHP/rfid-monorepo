// Shared by the page and by the route's validateSearch, so it cannot live in the
// component file without breaking fast refresh.
export const INTEGRATION_TABS = ["email", "calendar", "fax"] as const;

export type IntegrationTab = (typeof INTEGRATION_TABS)[number];

export const isIntegrationTab = (value: unknown): value is IntegrationTab =>
  typeof value === "string" &&
  INTEGRATION_TABS.includes(value as IntegrationTab);
