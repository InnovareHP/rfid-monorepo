import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";
import {
  CreateModuleGroupDto,
  UpdateModuleGroupDto,
} from "./dto/module-group.dto";

// Past this the sidebar stops reading as a list of folders and starts
// scrolling.
export const MAX_MODULE_GROUPS = 12;

@Injectable()
export class ModuleGroupService {
  // Empty groups ship too: a folder is made before its first module, and the
  // sidebar renders it so there is somewhere to create that module.
  async getGroups(organizationId: string) {
    return prisma.moduleGroup.findMany({
      where: { organizationId },
      orderBy: { groupOrder: "asc" },
      select: {
        id: true,
        name: true,
        groupOrder: true,
        _count: { select: { modules: true } },
      },
    });
  }

  async createGroup(dto: CreateModuleGroupDto, organizationId: string) {
    const [count, existing, last] = await Promise.all([
      prisma.moduleGroup.count({ where: { organizationId } }),
      prisma.moduleGroup.findFirst({
        where: { organizationId, name: dto.name },
        select: { id: true },
      }),
      prisma.moduleGroup.findFirst({
        where: { organizationId },
        orderBy: { groupOrder: "desc" },
        select: { groupOrder: true },
      }),
    ]);

    if (count >= MAX_MODULE_GROUPS) {
      throw new BadRequestException(
        `An organization can have at most ${MAX_MODULE_GROUPS} groups`
      );
    }

    if (existing) {
      throw new BadRequestException(`A group named ${dto.name} already exists`);
    }

    return prisma.moduleGroup.create({
      data: {
        name: dto.name,
        groupOrder: (last?.groupOrder ?? -1) + 1,
        organizationId,
      },
      select: { id: true, name: true, groupOrder: true },
    });
  }

  async updateGroup(
    id: string,
    dto: UpdateModuleGroupDto,
    organizationId: string
  ) {
    const group = await prisma.moduleGroup.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const taken = await prisma.moduleGroup.findFirst({
      where: { organizationId, name: dto.name, id: { not: id } },
      select: { id: true },
    });

    if (taken) {
      throw new BadRequestException(`A group named ${dto.name} already exists`);
    }

    return prisma.moduleGroup.update({
      where: { id },
      data: { name: dto.name },
      select: { id: true, name: true, groupOrder: true },
    });
  }

  // Deleting a folder is a display change: its modules return to the top level
  // rather than going with it, which is what the SetNull relation does.
  async deleteGroup(id: string, organizationId: string) {
    const group = await prisma.moduleGroup.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    await prisma.moduleGroup.delete({ where: { id } });

    return { id };
  }

  // The whole visible order arrives at once, the way module reorder works: one
  // drag renumbers every folder after it.
  async reorderGroups(groupIds: string[], organizationId: string) {
    const owned = await prisma.moduleGroup.findMany({
      where: { id: { in: groupIds }, organizationId },
      select: { id: true },
    });

    if (owned.length !== groupIds.length) {
      throw new BadRequestException("Unknown group in the requested order");
    }

    await prisma.$transaction(
      groupIds.map((id, index) =>
        prisma.moduleGroup.update({
          where: { id },
          data: { groupOrder: index },
        })
      )
    );

    return this.getGroups(organizationId);
  }
}
