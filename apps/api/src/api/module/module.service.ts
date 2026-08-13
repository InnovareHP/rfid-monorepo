import { Injectable } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";

@Injectable()
export class ModuleService {
  // Archived modules ship too: existing records still render under one, so the
  // caller decides whether a given surface hides them.
  async getModules(organizationId: string) {
    return prisma.module.findMany({
      where: { organizationId },
      orderBy: { moduleOrder: "asc" },
      select: {
        id: true,
        key: true,
        label: true,
        labelSingular: true,
        icon: true,
        isSystem: true,
        isArchived: true,
        moduleOrder: true,
      },
    });
  }
}
