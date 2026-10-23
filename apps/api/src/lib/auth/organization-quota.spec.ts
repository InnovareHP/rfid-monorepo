const findMany = jest.fn();
const count = jest.fn();
jest.mock("../prisma/prisma", () => ({
  prisma: {
    member: { findMany: (...a: unknown[]) => findMany(...a) },
    subscription: { count: (...a: unknown[]) => count(...a) },
  },
}));

import { hasExhaustedFreeOrganizations } from "./organization-quota";

const owns = (n: number) =>
  findMany.mockResolvedValue(
    Array.from({ length: n }, (_, i) => ({ organizationId: `org-${i}` }))
  );

beforeEach(() => {
  findMany.mockReset();
  count.mockReset();
});

// Each organization carries its own 14 day trial, so this is what stops one
// account taking the trial over and over.
describe("hasExhaustedFreeOrganizations", () => {
  it.each([0, 1, 2])("admits an owner of %i organizations", async (owned) => {
    owns(owned);
    await expect(hasExhaustedFreeOrganizations("user-1")).resolves.toBe(false);
    expect(count).not.toHaveBeenCalled();
  });

  it("blocks a fourth organization when none of the three pays", async () => {
    owns(3);
    count.mockResolvedValue(0);
    await expect(hasExhaustedFreeOrganizations("user-1")).resolves.toBe(true);
  });

  // The cap exists to stop trial farming, not to stop a customer opening
  // another location.
  it("admits a paying owner past the cap", async () => {
    owns(5);
    count.mockResolvedValue(1);
    await expect(hasExhaustedFreeOrganizations("user-1")).resolves.toBe(false);
  });

  it("counts organizations owned, not organizations joined", async () => {
    owns(3);
    count.mockResolvedValue(0);
    await hasExhaustedFreeOrganizations("user-1");
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", role: "owner" },
      select: { organizationId: true },
    });
  });

  // Scoped to this owner's organizations, or another tenant's active
  // subscription would unlock the cap.
  it("checks payment only on the organizations this user owns", async () => {
    owns(3);
    count.mockResolvedValue(0);
    await hasExhaustedFreeOrganizations("user-1");
    expect(count).toHaveBeenCalledWith({
      where: {
        referenceId: { in: ["org-0", "org-1", "org-2"] },
        status: "active",
      },
    });
  });
});
