import { toSlug } from "@dashboard/shared";
import { ModuleType } from "@prisma/client";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isSelectType } from "../../lib/helper";
import { seedDefaultAnalytics } from "../../lib/analytics/default-analytics";
import { prisma } from "../../lib/prisma/prisma";
import { CreateModuleDto, UpdateModuleDto } from "./dto/module.dto";

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
    const modules = await prisma.module.findMany({
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
        groupId: true,
        group: { select: { name: true } },
      },
    });

    // groupId is what a caller writes; the name rides along so a picker can
    // label the folder without joining the groups list itself.
    return modules.map(({ group, ...module }) => ({
      ...module,
      groupName: group?.name ?? null,
    }));
  }

  async createModule(dto: CreateModuleDto, organizationId: string) {
    const key = toModuleKey(dto.label);

    if (!key) {
      throw new BadRequestException(
        "Name must contain at least one letter or number"
      );
    }

    const [customCount, existing, lastModule, group] = await Promise.all([
      prisma.module.count({ where: { organizationId, isSystem: false } }),
      prisma.module.findFirst({ where: { organizationId, key } }),
      prisma.module.findFirst({
        where: { organizationId },
        orderBy: { moduleOrder: "desc" },
        select: { moduleOrder: true },
      }),
      dto.groupId
        ? prisma.moduleGroup.findFirst({
            where: { id: dto.groupId, organizationId },
            select: { id: true },
          })
        : null,
    ]);

    if (dto.groupId && !group) {
      throw new NotFoundException("Group not found");
    }

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
        groupId: dto.groupId ?? null,
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

  async updateModule(id: string, dto: UpdateModuleDto, organizationId: string) {
    const module = await prisma.module.findFirst({
      where: { id, organizationId },
      select: { id: true, isSystem: true },
    });

    if (!module) {
      throw new NotFoundException("Module not found");
    }

    // A folder from another tenant would move the module out of this sidebar
    // and into theirs.
    if (dto.groupId) {
      const group = await prisma.moduleGroup.findFirst({
        where: { id: dto.groupId, organizationId },
        select: { id: true },
      });

      if (!group) {
        throw new NotFoundException("Group not found");
      }
    }

    // A system module can be renamed and refiled, but not archived: the seeded
    // routes, analytics pages and link field types all assume it is there.
    if (module.isSystem && dto.isArchived) {
      throw new BadRequestException("A built-in module cannot be archived");
    }

    const { group, ...updated } = await prisma.module.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.labelSingular !== undefined && {
          labelSingular: dto.labelSingular,
        }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.groupId !== undefined && { groupId: dto.groupId }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
      },
      select: {
        id: true,
        key: true,
        label: true,
        labelSingular: true,
        icon: true,
        isSystem: true,
        isArchived: true,
        moduleOrder: true,
        groupId: true,
        group: { select: { name: true } },
      },
    });

    return { ...updated, groupName: group?.name ?? null };
  }

  // The whole visible order arrives at once: a drag moves one row but renumbers
  // every row after it, and one request keeps the sidebar from rendering a
  // half-applied order.
  async reorderModules(moduleIds: string[], organizationId: string) {
    const owned = await prisma.module.findMany({
      where: { id: { in: moduleIds }, organizationId },
      select: { id: true },
    });

    if (owned.length !== moduleIds.length) {
      throw new BadRequestException("Unknown module in the requested order");
    }

    await prisma.$transaction(
      moduleIds.map((id, index) =>
        prisma.module.update({
          where: { id },
          data: { moduleOrder: index },
        })
      )
    );

    return this.getModules(organizationId);
  }
}
