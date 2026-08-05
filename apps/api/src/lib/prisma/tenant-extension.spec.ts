import { runUnscoped, runWithTenant } from "./tenant-context";
import {
  applyTenantScope,
  SCOPED_MODELS,
  TenantScopeError,
} from "./tenant-extension";

const ORG = "org_a";

describe("SCOPED_MODELS", () => {
  it("covers the models that carry an organizationId column", () => {
    for (const model of ["Board", "Field", "FieldValue", "Task", "Activity"]) {
      expect(SCOPED_MODELS.has(model)).toBe(true);
    }
  });

  it("leaves platform and Better Auth owned models alone", () => {
    for (const model of ["User", "Organization", "SupportTicket", "Plan"]) {
      expect(SCOPED_MODELS.has(model)).toBe(false);
    }
  });

  // Better Auth resolves org membership through these before a tenant is known.
  it("excludes Member and Invitation", () => {
    expect(SCOPED_MODELS.has("Member")).toBe(false);
    expect(SCOPED_MODELS.has("Invitation")).toBe(false);
  });
});

describe("applyTenantScope", () => {
  it("throws when a scoped model is queried outside any context", () => {
    expect(() => applyTenantScope("Board", "findMany", {})).toThrow(
      TenantScopeError
    );
  });

  it("throws when the context has no active organization", async () => {
    await runWithTenant("", () => {
      expect(() => applyTenantScope("Board", "findMany", {})).toThrow(
        TenantScopeError
      );
    });
  });

  it("ignores models with no organization axis", () => {
    const args = { where: { id: "u1" } };
    expect(applyTenantScope("User", "findMany", args)).toBe(args);
  });

  it("injects the organization into every where based operation", async () => {
    await runWithTenant(ORG, () => {
      for (const operation of [
        "findFirst",
        "findMany",
        "findUnique",
        "count",
        "update",
        "updateMany",
        "delete",
        "deleteMany",
      ]) {
        const scoped = applyTenantScope("Board", operation, {
          where: { id: "b1" },
        });
        expect(scoped.where).toEqual({ id: "b1", organizationId: ORG });
      }
    });
  });

  it("injects the organization when no where was given", async () => {
    await runWithTenant(ORG, () => {
      expect(applyTenantScope("Board", "findMany", undefined).where).toEqual({
        organizationId: ORG,
      });
    });
  });

  it("stamps the organization onto creates", async () => {
    await runWithTenant(ORG, () => {
      const scoped = applyTenantScope("Board", "create", {
        data: { recordName: "Acme" },
      });
      expect(scoped.data).toEqual({ recordName: "Acme", organizationId: ORG });
    });
  });

  it("stamps every row of a createMany", async () => {
    await runWithTenant(ORG, () => {
      const scoped = applyTenantScope("Board", "createMany", {
        data: [{ recordName: "a" }, { recordName: "b" }],
      });
      expect(scoped.data).toEqual([
        { recordName: "a", organizationId: ORG },
        { recordName: "b", organizationId: ORG },
      ]);
    });
  });

  it("refuses a write aimed at another organization", async () => {
    await runWithTenant(ORG, () => {
      expect(() =>
        applyTenantScope("Board", "create", {
          data: { recordName: "Acme", organizationId: "org_b" },
        })
      ).toThrow(TenantScopeError);
    });
  });

  // Setting the scalar and the relation together is a Prisma error.
  it("leaves a nested organization connect untouched", async () => {
    await runWithTenant(ORG, () => {
      const data = {
        recordName: "Acme",
        organization: { connect: { id: ORG } },
      };
      expect(applyTenantScope("Board", "create", { data }).data).toBe(data);
    });
  });

  it("scopes both halves of an upsert", async () => {
    await runWithTenant(ORG, () => {
      const scoped = applyTenantScope("Board", "upsert", {
        where: { id: "b1" },
        create: { recordName: "Acme" },
        update: { recordName: "Acme" },
      });
      expect(scoped.where).toEqual({ id: "b1", organizationId: ORG });
      expect(scoped.create.organizationId).toBe(ORG);
      expect(scoped.update.organizationId).toBe(ORG);
    });
  });

  // Prisma queries are lazy, so a callback that returns one without awaiting it
  // used to let the store close before the query ran.
  it("holds the context open for a promise the callback only returns", async () => {
    const deferred = () =>
      Promise.resolve().then(() => applyTenantScope("Board", "findMany", {}));

    const scoped = await runWithTenant(ORG, deferred);
    expect(scoped.where).toEqual({ organizationId: ORG });
  });

  it("stands down inside the unscoped escape hatch", async () => {
    await runUnscoped(() => {
      const args = { where: { slug: "public-form" } };
      expect(applyTenantScope("Form", "findFirst", args)).toBe(args);
    });
  });

  it("keeps one tenant's context out of another's", async () => {
    await runWithTenant("org_a", async () => {
      expect(applyTenantScope("Board", "findMany", {}).where).toEqual({
        organizationId: "org_a",
      });

      await runWithTenant("org_b", () => {
        expect(applyTenantScope("Board", "findMany", {}).where).toEqual({
          organizationId: "org_b",
        });
      });

      expect(applyTenantScope("Board", "findMany", {}).where).toEqual({
        organizationId: "org_a",
      });
    });
  });
});
