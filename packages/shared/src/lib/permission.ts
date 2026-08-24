import { ROLES } from "./constant";

// Domain resources on the organization axis. Better Auth's own organization
// and admin statements are merged in where the access control is built, since
// better-auth/plugins/access is ESM only and this package compiles to CJS.
export const DOMAIN_STATEMENT = {
  record: ["create", "read", "update", "delete", "import", "export"],
  field: ["create", "update", "delete", "configure"],
  log: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  outreach: ["create", "read", "update", "delete", "send"],
  task: ["create", "read", "update", "delete"],
  analytics: ["read", "manage"],
  billing: ["manage_billing"],
  license: ["manage_licenses"],
  compliance: ["read", "manage", "download"],
} as const;

export type DomainStatement = typeof DOMAIN_STATEMENT;
export type DomainResource = keyof DomainStatement;

export type DomainPermission = {
  [K in DomainResource]?: DomainStatement[K][number][];
};

const RECORD_WRITE = ["create", "read", "update", "delete"] as const;
const FIELD_WRITE = ["create", "update", "delete"] as const;
const LOG_WRITE = ["create", "read", "update", "delete"] as const;
const OUTREACH_WRITE = ["create", "read", "update", "delete"] as const;
const TASK_WRITE = ["create", "read", "update", "delete"] as const;

// Mirrors the deny rules the frontend already applies: reports and history
// exclude liaisons, import and sending exclude both operational roles, and
// billing stays owner only. Nothing else is taken away from a role.
export const DOMAIN_ROLE_PERMISSIONS = {
  [ROLES.OWNER]: {
    record: [...RECORD_WRITE, "import", "export"],
    field: [...FIELD_WRITE, "configure"],
    log: [...LOG_WRITE],
    report: ["read", "export"],
    outreach: [...OUTREACH_WRITE, "send"],
    task: [...TASK_WRITE],
    analytics: ["read", "manage"],
    billing: ["manage_billing"],
    license: ["manage_licenses"],
    compliance: ["read", "manage", "download"],
  },
  [ROLES.ADMIN]: {
    record: [...RECORD_WRITE, "import", "export"],
    field: [...FIELD_WRITE, "configure"],
    log: [...LOG_WRITE],
    report: ["read", "export"],
    outreach: [...OUTREACH_WRITE, "send"],
    task: [...TASK_WRITE],
    analytics: ["read"],
    compliance: ["read", "download"],
  },
  [ROLES.ADMISSION_MANAGER]: {
    record: [...RECORD_WRITE],
    field: [...FIELD_WRITE],
    log: [...LOG_WRITE],
    report: ["read", "export"],
    outreach: [...OUTREACH_WRITE],
    task: [...TASK_WRITE],
    analytics: ["read", "manage"],
    compliance: ["read"],
  },
  [ROLES.LIAISON]: {
    record: [...RECORD_WRITE],
    field: [...FIELD_WRITE],
    log: [...LOG_WRITE],
    outreach: [...OUTREACH_WRITE],
    task: [...TASK_WRITE],
    analytics: ["read"],
    compliance: ["read"],
  },
} as const satisfies Record<string, DomainPermission>;

export type OrgRole = keyof typeof DOMAIN_ROLE_PERMISSIONS;
