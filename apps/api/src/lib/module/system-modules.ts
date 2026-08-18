import { ModuleType } from "@prisma/client";
import { prisma } from "src/lib/prisma/prisma";

// The record types every organization starts with. Labels match the sidebar
// text so the data-driven sidebar renders the same words it does today.
export const SYSTEM_MODULES = [
  {
    key: "LEAD",
    label: "Master Marketing List",
    labelSingular: "Lead",
    icon: "FileText",
    moduleOrder: 0,
  },
  {
    key: "REFERRAL",
    label: "Referral Logs",
    labelSingular: "Referral",
    icon: "Users",
    moduleOrder: 1,
  },
  {
    key: "CONTACT",
    label: "Phonebook",
    labelSingular: "Contact",
    icon: "Contact",
    moduleOrder: 2,
  },
  {
    key: "COMPANY",
    label: "Companies",
    labelSingular: "Company",
    icon: "Building2",
    moduleOrder: 3,
  },
] as const;

export const seedSystemModules = (organizationId: string) =>
  prisma.module.createMany({
    data: SYSTEM_MODULES.map((systemModule) => ({
      ...systemModule,
      isSystem: true,
      organizationId,
    })),
    skipDuplicates: true,
  });

// Every row written during the dual-write window needs its module, so a missing
// one means the seed did not run and should fail loudly rather than write null.
export const resolveModuleId = async (key: string) => {
  const found = await prisma.module.findFirst({
    where: { key },
    select: { id: true },
  });

  if (!found) throw new Error(`No module "${key}" for the active organization`);

  return found.id;
};

// A custom module has no enum member of its own, so the legacy column records
// CUSTOM and moduleId carries the identity.
const MODULE_TYPE_BY_KEY: Record<string, ModuleType> = {
  LEAD: ModuleType.LEAD,
  REFERRAL: ModuleType.REFERRAL,
  CONTACT: ModuleType.CONTACT,
  COMPANY: ModuleType.COMPANY,
};

export const toModuleType = (key: string): ModuleType =>
  MODULE_TYPE_BY_KEY[key] ?? ModuleType.CUSTOM;
