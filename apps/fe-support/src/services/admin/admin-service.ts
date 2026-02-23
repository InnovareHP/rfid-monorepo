import { authClient } from "@/lib/auth-client";
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
  members: AdminOrganizationMember[];
  subscription: AdminOrganizationSubscription | null;
};

export type ListOrganizationsParams = {
  page?: number;
  take?: number;
  search?: string;
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

// ─── Admin Actions (routed through backend for audit logging) ───────

export async function banUser(
  userId: string,
  banReason?: string,
  banExpiresIn?: number
) {
  const { data } = await axiosClient.post("/api/user/admin/ban", {
    userId,
    banReason,
    banExpiresIn,
  });
  return data;
}

export async function unbanUser(userId: string) {
  const { data } = await axiosClient.post("/api/user/admin/unban", {
    userId,
  });
  return data;
}

export async function setUserRole(userId: string, role: string) {
  const { data } = await axiosClient.post("/api/user/admin/set-role", {
    userId,
    role,
  });
  return data;
}

export async function removeUser(userId: string) {
  const { data } = await axiosClient.post("/api/user/admin/remove", {
    userId,
  });
  return data;
}

export async function verifyEmail(userId: string) {
  const { data } = await authClient.admin.updateUser({
    userId,
    data: {
      emailVerified: true,
    },
  });
  return data;
}

export async function sendVerificationEmail(
  userId: string,
  newPassword: string
) {
  const { data, error } = await authClient.admin.setUserPassword({
    userId,
    newPassword,
  });

  if (error) throw error;
  return data;
}

export async function revokeSession(sessionId: string) {
  const { data, error } = await authClient.admin.revokeUserSessions({
    userId: sessionId,
  });
  if (error) throw error;
  return data;
}

export async function impersonateUser(userId: string) {
  const { data, error } = await authClient.admin.impersonateUser({
    userId,
  });
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
