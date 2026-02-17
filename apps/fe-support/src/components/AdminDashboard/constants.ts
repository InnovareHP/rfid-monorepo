/**
 * Admin Dashboard shared constants.
 * Used by AdminDashboardPage, AdminLayout, and AdminSidebar.
 */

// ——— Page copy (AdminDashboardPage) ———
export const ADMIN_PAGE_TITLE = "Admin Dashboard";
export const ADMIN_PAGE_DESCRIPTION = "Platform administration and support tools";
export const ADMIN_CARD_TITLE = "Welcome to the Admin Dashboard";
export const ADMIN_CARD_DESCRIPTION =
  "Use this dashboard to manage platform settings, view support tickets, and access admin tools.";
export const SUPPORT_PORTAL_LINK_LABEL = "Go to Support Portal";

// ——— Layout (AdminLayout) ———
export const ADMIN_BREADCRUMB_LABEL = "Admin";

// ——— Assets (AdminSidebar) ———
export const LOGO_RFID_PATH = "/images/rfid.png";
export const LOGO_TARSIER_PATH = "/images/tarsier.png";

// ——— Sidebar nav (AdminSidebar) ———
export type AdminNavId = "admin" | "support";

export const ADMIN_NAV_ITEMS: Array<{
  id: AdminNavId;
  title: string;
  path: "/admin" | "/$lang";
  params?: { lang: string };
}> = [
  { id: "admin", title: "Admin Dashboard", path: "/admin" },
  {
    id: "support",
    title: "Support Portal",
    path: "/$lang",
    params: { lang: "en" },
  },
];

// ——— Misc labels (AdminSidebar) ———
export const LOGO_ALT = "Admin Dashboard";
export const SIDEBAR_GROUP_LABEL = "Admin";
export const LOG_OUT_LABEL = "Log out";
export const USER_FALLBACK_NAME = "User";
export const USER_FALLBACK_INITIAL = "U";
