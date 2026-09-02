import { toSlug } from "@dashboard/shared";
import { ModuleType } from "@prisma/client";
import { BadRequestException, Injectable } from "@nestjs/common";
import { isSelectType } from "../../lib/helper";
import { seedDefaultAnalytics } from "../../lib/analytics/default-analytics";
import { prisma } from "../../lib/prisma/prisma";
import { CreateModuleDto } from "./dto/module.dto";

// The binding constraint is sidebar legibility, not storage. When module count
// becomes a plan lever this is the single place that swaps for an entitlement.
export const MAX_CUSTOM_MODULES = 10;

// Uppercase, underscore-separated, derived from the label and frozen at
// creation: the key lands in URLs and query keys, so it cannot be free text.
const toModuleKey = (label: string) =>
  toSlug(label).replace(/-/g, "_").toUpperCase();

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

  async createModule(dto: CreateModuleDto, organizationId: string) {
    const key = toModuleKey(dto.label);

    if (!key) {
      throw new BadRequestException(
        "Name must contain at least one letter or number"
      );
    }

    const [customCount, existing, lastModule] = await Promise.all([
      prisma.module.count({ where: { organizationId, isSystem: false } }),
      prisma.module.findFirst({ where: { organizationId, key } }),
      prisma.module.findFirst({
        where: { organizationId },
        orderBy: { moduleOrder: "desc" },
        select: { moduleOrder: true },
      }),
    ]);

    if (customCount >= MAX_CUSTOM_MODULES) {
      throw new BadRequestException(
        `An organization can have at most ${MAX_CUSTOM_MODULES} custom modules`
      );
    }

    if (existing) {
      throw new BadRequestException(
        `A module named ${dto.label} already exists`
      );
    }

    const created = await prisma.module.create({
      data: {
        key,
        label: dto.label,
        labelSingular: dto.labelSingular,
        icon: dto.icon ?? null,
        moduleOrder: (lastModule?.moduleOrder ?? 0) + 1,
        organizationId,
        fields: {
          create: dto.fields.map((field, index) => ({
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            fieldOrder: index + 1,
            moduleType: ModuleType.CUSTOM,
            organizationId,
            options: {
              create: (isSelectType(field.fieldType)
                ? (field.options ?? [])
                : []
              ).map((optionName, optionIndex) => ({
                optionName,
                optionOrder: optionIndex + 1,
                organizationId,
              })),
            },
          })),
        },
      },
      select: { id: true, key: true, label: true, labelSingular: true },
    });

    // A new module opens on an analytics page rather than a blank one.
    await seedDefaultAnalytics(created.id, organizationId);

    return created;
  }
}
