import { DOMAIN_ROLE_PERMISSIONS, ROLES } from "@dashboard/shared";

// Dashboards are built and changed by owners and admins only. Every other role
// reads them, so a liaison opening an analytics page sees the charts but no
// tile menu, and the API guard refuses the write even if the UI were bypassed.
describe("analytics grants", () => {
  type Role = keyof typeof DOMAIN_ROLE_PERMISSIONS;

  const grants = (role: Role) =>
    DOMAIN_ROLE_PERMISSIONS[role].analytics as readonly string[];

  it("lets an owner and an admin manage", () => {
    expect(grants(ROLES.OWNER)).toContain("manage");
    expect(grants(ROLES.ADMIN)).toContain("manage");
  });

  it("denies an admission manager and a liaison", () => {
    expect(grants(ROLES.MEMBER)).not.toContain("manage");
    expect(grants(ROLES.LIAISON)).not.toContain("manage");
  });

  it("still lets every role read", () => {
    for (const role of Object.keys(DOMAIN_ROLE_PERMISSIONS) as Role[]) {
      expect(grants(role)).toContain("read");
    }
  });
});
