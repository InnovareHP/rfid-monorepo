import { authClient, type AdminRole } from "@/lib/auth-client";
import { axiosClient } from "@/lib/axios-client";

// ─── User Types ─────────────────────────────────────────────────────

export type AdminUserOrganization = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  memberRole: string;
  memberSince: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
  createdAt: string;
  emailVerified: boolean;
  organizations: AdminUserOrganization[];
};

export type ListUsersParams = {
  page?: number;
  take?: number;
  search?: string;
  roleFilter?: string;
  sortBy?: string;
  order?: "asc" | "desc";
};

export type ListUsersResponse = {
  users: AdminUser[];
  total: number;
};

// ─── Activity Log Types ─────────────────────────────────────────────

export type ActivityLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  details: string | null;
  targetOrgId: string | null;
  ipAddress: string | null;
  admin: {
    id: string;
    name: string;
    image: string | null;
  };
  targetUser: {
    id: string;
    name: string;
    image: string | null;
  } | null;
};

export type ActivityLogResponse = {
  logs: ActivityLogEntry[];
  total: number;
};

export type ActivityLogParams = {
  page?: number;
  take?: number;
  actionFilter?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
};

// ─── Organization Types ─────────────────────────────────────────────

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: string;
  metadata: string | null;
  memberCount: number;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  entitlementLabel: string;
  hipaaEnabled: boolean;
  baaAcceptedAt: string | null;
};

export type AdminOrganizationCompliance = {
  hipaaEnabled: boolean;
  baaAcceptedAt: string | null;
  baaVersion: string | null;
  retentionDays: number;
  planSupportsHipaa: boolean;
  agreement: {
    termsVersion: string;
    signedAt: string;
    signerName: string;
    signerTitle: string;
    signerEmail: string;
    companyLegalName: string;
    acceptanceMethod: string;
    ipAddress: string | null;
    hasDocument: boolean;
  } | null;
};

export type AdminOrganizationEntitlement = {
  label: string;
  seats: number;
  features: string[];
  isCustom: boolean;
  // Null on a tier plan: only a contract carries a negotiated price.
  priceCents: number | null;
  setupFeeCents: number | null;
  billingInterval: "monthly" | "annual" | null;
};

export type AdminMetrics = {
  users: {
    total: number;
    banned: number;
    superAdmins: number;
    onboarded: number;
    newLast30Days: number;
  };
  organizations: {
    total: number;
    hipaaEnabled: number;
    baaSigned: number;
    newLast30Days: number;
  };
  subscriptions: {
    byStatus: { status: string; count: number }[];
    customContracts: number;
    trialsExpiringIn7Days: number;
  };
};

export type AdminOrganizationMember = {
  memberId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    banned: boolean;
  };
};

export type AdminOrganizationSubscription = {
  id: string;
  plan: string;
  status: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  seats: number | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAt: string | null;
};

export type AdminOrganizationDetail = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: string;
  metadata: string | null;
  stripeCustomerId: string | null;
  compliance: AdminOrganizationCompliance;
  entitlement: AdminOrganizationEntitlement;
  members: AdminOrganizationMember[];
  subscription: AdminOrganizationSubscription | null;
};

export type ListOrganizationsParams = {
  page?: number;
  take?: number;
  search?: string;
  hipaaOnly?: boolean;
};

export type ListOrganizationsResponse = {
  organizations: AdminOrganization[];
  total: number;
};

// ─── User Service Functions ─────────────────────────────────────────

export async function listUsers(
  params?: ListUsersParams
): Promise<ListUsersResponse> {
  const { data } = await axiosClient.get("/api/user/admin/users", {
    params,
  });
  return data;
}

export async function getUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.get(`/api/user/admin/users/${userId}`);
  return data;
}

// ─── Admin Actions ──────────────────────────────────────────────────
// Every call below is audited by the after hook in the API's Better Auth
// config, so there is nothing for the client to log.

export async function banUser(
  userId: string,
  banReason?: string,
  banExpiresIn?: number
) {
  const { data, error } = await authClient.admin.banUser({
    userId,
    banReason,
    banExpiresIn,
  });
  if (error) throw error;
  return data;
}

export async function unbanUser(userId: string) {
  const { data, error } = await authClient.admin.unbanUser({ userId });
  if (error) throw error;
  return data;
}

export async function setUserRole(userId: string, role: AdminRole) {
  const { data, error } = await authClient.admin.setRole({ userId, role });
  if (error) throw error;
  return data;
}

export async function removeUser(userId: string) {
  const { data, error } = await authClient.admin.removeUser({ userId });
  if (error) throw error;
  return data;
}

export async function verifyEmail(userId: string) {
  const { data, error } = await authClient.admin.updateUser({
    userId,
    data: {
      emailVerified: true,
    },
  });
  if (error) throw error;
  return data;
}

export async function setUserPassword(userId: string, newPassword: string) {
  const { data, error } = await authClient.admin.setUserPassword({
    userId,
    newPassword,
  });

  if (error) throw error;
  return data;
}

export async function revokeUserSessions(userId: string) {
  const { data, error } = await authClient.admin.revokeUserSessions({
    userId,
  });
  if (error) throw error;
  return data;
}

// The reason travels as a header because the admin plugin strips body keys it
// does not declare, and the API rejects the call without it.
export async function impersonateUser(userId: string, reason: string) {
  const { data, error } = await authClient.admin.impersonateUser(
    { userId },
    { headers: { "x-impersonation-reason": reason } }
  );
  if (error) throw error;
  return data;
}

export async function stopImpersonating() {
  const { data, error } = await authClient.admin.stopImpersonating();
  if (error) throw error;
  return data;
}

export async function getActivityLog(
  params?: ActivityLogParams
): Promise<ActivityLogResponse> {
  const { data } = await axiosClient.get("/api/user/admin/activity-log", {
    params,
  });
  return data;
}

export async function listOrganizations(
  params?: ListOrganizationsParams
): Promise<ListOrganizationsResponse> {
  const { data } = await axiosClient.get("/api/user/admin/organizations", {
    params,
  });
  return data;
}

export async function getOrganization(
  orgId: string
): Promise<AdminOrganizationDetail> {
  const { data } = await axiosClient.get(
    `/api/user/admin/organizations/${orgId}`
  );
  return data;
}

export type EntitlementContract = {
  label: string;
  seats: number;
  features: string[];
  // Cents, so the invoice amount is exact. Zero is a comped contract.
  priceCents: number;
  setupFeeCents: number;
  billingInterval: "monthly" | "annual";
};

// Null clears the contract and hands the org back to its plan tier.
export async function setOrganizationEntitlement(
  orgId: string,
  contract: EntitlementContract | null
): Promise<AdminOrganizationEntitlement> {
  const { data } = await axiosClient.patch(
    `/api/user/admin/organizations/${orgId}/entitlement`,
    { contract }
  );
  return data;
}

export async function getMetrics(): Promise<AdminMetrics> {
  const { data } = await axiosClient.get("/api/user/admin/metrics");
  return data;
}

// Streams the executed BAA straight to a download; the bytes never enter state.
export async function downloadOrganizationBaa(orgId: string, orgName: string) {
  const { data } = await axiosClient.get(
    `/api/user/admin/organizations/${orgId}/baa`,
    { responseType: "blob" }
  );

  const url = URL.createObjectURL(data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `baa-${orgName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
