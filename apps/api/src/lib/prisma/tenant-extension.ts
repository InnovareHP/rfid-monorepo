import { Prisma } from "@prisma/client";
import { getTenantStore } from "./tenant-context";

// Better Auth's organization plugin reads these through the same client while
// resolving which organizations a user belongs to, so scoping them to the
// active organization would break org switching and invitation acceptance.
const AUTH_MANAGED = new Set(["Member", "Invitation"]);

// Derived from the datamodel so a new model with an organizationId column is
// covered the moment it is generated, with no list to keep in sync.
export const SCOPED_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) =>
      model.fields.some(
        (field) => field.name === "organizationId" && field.kind === "scalar"
      )
    )
    .map((model) => model.name)
    .filter((name) => !AUTH_MANAGED.has(name))
);

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopeError";
  }
}

const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

function resolveOrganizationId(model: string, operation: string) {
  const store = getTenantStore();

  if (!store) {
    throw new TenantScopeError(
      `${model}.${operation} ran outside a tenant context. Wrap the entry point in runWithTenant or runUnscoped.`
    );
  }

  if (store.unscoped) return null;

  if (!store.organizationId) {
    throw new TenantScopeError(
      `${model}.${operation} ran without an active organization.`
    );
  }

  return store.organizationId;
}

function scopeWhere(args: any, organizationId: string) {
  return { ...(args ?? {}), where: { ...(args?.where ?? {}), organizationId } };
}

function scopeData(model: string, data: any, organizationId: string): any {
  if (Array.isArray(data)) {
    return data.map((row) => scopeData(model, row, organizationId));
  }

  if (!data || typeof data !== "object") return data;

  // A nested connect already names the organization, and setting both is an error.
  if ("organization" in data) return data;

  if (data.organizationId && data.organizationId !== organizationId) {
    throw new TenantScopeError(
      `${model} was written with an organizationId outside the active organization.`
    );
  }

  return { ...data, organizationId };
}

// Exported so the rules can be asserted without a database behind them.
export function applyTenantScope(model: string, operation: string, args: any) {
  if (!SCOPED_MODELS.has(model)) return args;

  const organizationId = resolveOrganizationId(model, operation);
  if (!organizationId) return args;

  if (WHERE_OPS.has(operation)) return scopeWhere(args, organizationId);

  if (operation === "create" || operation === "createMany") {
    return { ...args, data: scopeData(model, args?.data, organizationId) };
  }

  if (operation === "upsert") {
    return {
      ...args,
      where: { ...(args?.where ?? {}), organizationId },
      create: scopeData(model, args?.create, organizationId),
      update: scopeData(model, args?.update, organizationId),
    };
  }

  return args;
}

export const tenantExtension = Prisma.defineExtension({
  name: "tenant-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        return query(applyTenantScope(model, operation, args));
      },
    },
  },
});
