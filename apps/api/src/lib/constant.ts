export const MEMBER = "member";
export const ADMIN = "admin";
export const SUPER_ADMIN = "super_admin";
export const CACHE_PREFIX = {
  BOARDS: "boards",
  // Chart and dashboard runs: a full module scan each, so they are cached per
  // organization and purged whenever a chart or its dashboard changes.
  CUSTOM_ANALYTICS: "custom_analytics",
  MANUAL: "manual",
  ASSISTANT: "assistant",
};
