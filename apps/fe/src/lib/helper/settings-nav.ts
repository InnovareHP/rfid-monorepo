// The settings pages never moved under one route prefix, so the surface is
// defined by the paths that belong to it rather than by a single subtree.
const SETTINGS_SUBPATHS = [
  "/settings",
  "/team",
  "/profile",
  "/notifications",
  "/plans",
];

export const settingsPathPrefixes = (activeOrganizationId: string) =>
  SETTINGS_SUBPATHS.map((path) => `/${activeOrganizationId}${path}`);

export const isSettingsPath = (
  pathname: string,
  activeOrganizationId: string
) =>
  settingsPathPrefixes(activeOrganizationId).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
