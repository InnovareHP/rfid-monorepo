import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ModuleType, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma/prisma";
import {
  applyAudienceFilter,
  resolveLinkFieldValues,
} from "./audience-resolver.util";
import { CreateGroupDto, UpdateGroupDto } from "./dto/group.dto";

export type AudienceFilter = {
  filter: Record<string, string>;
  search?: string;
  boardDateFrom?: string;
  boardDateTo?: string;
};

export type GroupMember = {
  recordId: string;
  recordName: string;
  email: string | null;
};

@Injectable()
export class GroupService {
  async getGroups(organizationId: string) {
    return prisma.recipientGroup.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { blasts: true } } },
    });
  }

  async getGroup(id: string, organizationId: string) {
    const group = await prisma.recipientGroup.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { blasts: true } } },
    });

    if (!group) throw new NotFoundException("Group not found");

    return group;
  }

  async createGroup(
    dto: CreateGroupDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.recipientGroup.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        moduleType: dto.moduleType ?? ModuleType.LEAD,
        filter: dto.filter as Prisma.InputJsonValue,
        organizationId,
        createdBy: userId,
      },
    });
  }

  async updateGroup(id: string, dto: UpdateGroupDto, organizationId: string) {
    await this.getGroup(id, organizationId);

    return prisma.recipientGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.moduleType !== undefined && { moduleType: dto.moduleType }),
        ...(dto.filter !== undefined && {
          filter: dto.filter as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async deleteGroup(id: string, organizationId: string) {
    const group = await this.getGroup(id, organizationId);

    // Deleting a group a blast still points at would silently empty that blast.
    if (group._count.blasts > 0) {
      throw new BadRequestException(
        "This group is used by a blast. Remove it from the blast first."
      );
    }

    await prisma.recipientGroup.delete({ where: { id } });

    return { message: "Group deleted successfully" };
  }

  async resolveAudience(
    organizationId: string,
    moduleType: ModuleType,
    audienceFilter: AudienceFilter
  ) {
    const { filter, search, boardDateFrom, boardDateTo } = audienceFilter;

    const where: Prisma.BoardWhereInput = {
      organizationId,
      moduleType,
      isDeleted: false,
    };

    if (boardDateFrom || boardDateTo) {
      where.createdAt = {
        ...(boardDateFrom && { gte: new Date(boardDateFrom) }),
        ...(boardDateTo && { lte: new Date(boardDateTo) }),
      };
    }

    const [boards, fields] = await Promise.all([
      prisma.board.findMany({
        where,
        include: {
          values: {
            select: {
              field: { select: { id: true, fieldName: true, fieldType: true } },
              value: true,
            },
          },
        },
      }),
      prisma.field.findMany({
        where: { organizationId, moduleType, isDeleted: false },
      }),
    ]);

    const resolved = await resolveLinkFieldValues(
      boards,
      fields,
      organizationId
    );

    return applyAudienceFilter(resolved, fields, { search, filter });
  }

  // Members without an email are kept and marked, so the group page shows who
  // will be skipped rather than quietly dropping them.
  async resolveMembers(
    organizationId: string,
    moduleType: ModuleType,
    audienceFilter: AudienceFilter
  ): Promise<GroupMember[]> {
    const [boards, emailField] = await Promise.all([
      this.resolveAudience(organizationId, moduleType, audienceFilter),
      prisma.field.findFirst({
        where: {
          organizationId,
          moduleType,
          fieldType: "EMAIL",
          isDeleted: false,
        },
        select: { id: true },
      }),
    ]);

    return boards.map((board) => ({
      recordId: board.id,
      recordName: board.recordName,
      email: emailField
        ? (board.values.find((v) => v.field.id === emailField.id)?.value ??
          null)
        : null,
    }));
  }

  async previewMembers(
    organizationId: string,
    moduleType: ModuleType,
    audienceFilter: AudienceFilter,
    page: number,
    limit: number
  ) {
    const members = await this.resolveMembers(
      organizationId,
      moduleType,
      audienceFilter
    );

    return {
      total: members.length,
      reachable: members.filter((m) => m.email).length,
      page,
      limit,
      members: members.slice((page - 1) * limit, page * limit),
    };
  }

  async getGroupMembers(
    id: string,
    organizationId: string,
    page: number,
    limit: number
  ) {
    const group = await this.getGroup(id, organizationId);

    return this.previewMembers(
      organizationId,
      group.moduleType,
      group.filter as unknown as AudienceFilter,
      page,
      limit
    );
  }

  // A blast unions its groups and dedupes on record, so overlapping groups
  // never mail the same person twice.
  async resolveForGroups(
    organizationId: string,
    groupIds: string[]
  ): Promise<GroupMember[]> {
    const groups = await prisma.recipientGroup.findMany({
      where: { id: { in: groupIds }, organizationId },
    });

    if (groups.length !== groupIds.length) {
      throw new BadRequestException(
        "One or more groups were not found in this organization"
      );
    }

    const byRecord = new Map<string, GroupMember>();

    for (const group of groups) {
      const members = await this.resolveMembers(
        organizationId,
        group.moduleType,
        group.filter as unknown as AudienceFilter
      );
      for (const member of members) byRecord.set(member.recordId, member);
    }

    return [...byRecord.values()];
  }
}
