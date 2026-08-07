import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BlastStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { prisma } from "../../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../../lib/queue/queue.constants";
import { GroupService } from "../group/group.service";
import { CreateBlastDto, UpdateBlastDto } from "./dto/blast.dto";

const groupInclude = {
  groups: {
    select: {
      group: {
        select: { id: true, name: true, moduleType: true },
      },
    },
  },
} as const;

@Injectable()
export class BlastService {
  constructor(
    @InjectQueue(QUEUE_NAMES.BLAST_SEND)
    private readonly blastSendQueue: Queue,
    private readonly groupService: GroupService
  ) {}

  async getBlasts(organizationId: string) {
    return prisma.blast.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { recipients: true } },
        ...groupInclude,
      },
    });
  }

  async getBlast(id: string, organizationId: string) {
    const blast = await prisma.blast.findFirst({
      where: { id, organizationId },
      include: groupInclude,
    });

    if (!blast) throw new NotFoundException("Blast not found");

    return blast;
  }

  async createBlast(
    dto: CreateBlastDto,
    organizationId: string,
    userId: string
  ) {
    if (dto.campaignId) {
      await this.assertCampaignInOrg(dto.campaignId, organizationId);
    }

    const groupIds = dto.groupIds ?? [];
    await this.assertGroupsInOrg(groupIds, organizationId);

    return prisma.blast.create({
      data: {
        name: dto.name,
        campaignId: dto.campaignId ?? null,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        organizationId,
        createdBy: userId,
        groups: { create: groupIds.map((groupId) => ({ groupId })) },
      },
      include: groupInclude,
    });
  }

  async updateBlast(id: string, dto: UpdateBlastDto, organizationId: string) {
    const blast = await this.getBlast(id, organizationId);

    if (blast.status !== BlastStatus.DRAFT) {
      throw new BadRequestException("Only draft blasts can be updated");
    }

    if (dto.campaignId) {
      await this.assertCampaignInOrg(dto.campaignId, organizationId);
    }

    if (dto.groupIds !== undefined) {
      await this.assertGroupsInOrg(dto.groupIds, organizationId);
    }

    return prisma.blast.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.campaignId !== undefined && { campaignId: dto.campaignId }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.bodyHtml !== undefined && { bodyHtml: dto.bodyHtml }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
        ...(dto.groupIds !== undefined && {
          groups: {
            deleteMany: {},
            create: dto.groupIds.map((groupId) => ({ groupId })),
          },
        }),
      },
      include: groupInclude,
    });
  }

  async deleteBlast(id: string, organizationId: string) {
    const blast = await this.getBlast(id, organizationId);

    if (blast.status !== BlastStatus.DRAFT) {
      throw new BadRequestException("Only draft blasts can be deleted");
    }

    await prisma.blast.delete({ where: { id } });

    return { message: "Blast deleted successfully" };
  }

  async getAudienceCount(id: string, organizationId: string) {
    const members = await this.resolveMembers(id, organizationId);

    return {
      count: members.filter((m) => m.email).length,
      total: members.length,
    };
  }

  async enqueueSend(
    id: string,
    organizationId: string,
    userId: string,
    sendVia?: string
  ) {
    const blast = await this.getBlast(id, organizationId);

    if (blast.status !== BlastStatus.DRAFT) {
      throw new BadRequestException("Only draft blasts can be sent");
    }

    const members = await this.resolveMembers(id, organizationId);
    const recipients = members.filter((m): m is typeof m & { email: string } =>
      Boolean(m.email)
    );

    if (recipients.length === 0) {
      throw new BadRequestException(
        "No recipients with a valid email address were resolved for these groups"
      );
    }

    await prisma.blastRecipient.createMany({
      data: recipients.map((r) => ({
        blastId: id,
        recordId: r.recordId,
        email: r.email,
        status: "PENDING",
      })),
      skipDuplicates: true,
    });

    await prisma.blast.update({
      where: { id },
      data: { status: BlastStatus.SENDING },
    });

    const job = await this.blastSendQueue.add("blast-send", {
      blastId: id,
      organizationId,
      userId,
      sendVia,
    });

    return { jobId: job.id };
  }

  private async resolveMembers(id: string, organizationId: string) {
    const blast = await this.getBlast(id, organizationId);
    const groupIds = blast.groups.map((link) => link.group.id);

    if (groupIds.length === 0) {
      throw new BadRequestException("This blast has no recipient groups");
    }

    return this.groupService.resolveForGroups(organizationId, groupIds);
  }

  private async assertGroupsInOrg(groupIds: string[], organizationId: string) {
    if (groupIds.length === 0) return;

    const found = await prisma.recipientGroup.count({
      where: { id: { in: groupIds }, organizationId },
    });

    if (found !== new Set(groupIds).size) {
      throw new BadRequestException(
        "One or more groups were not found in this organization"
      );
    }
  }

  private async assertCampaignInOrg(
    campaignId: string,
    organizationId: string
  ) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true },
    });

    if (!campaign) {
      throw new BadRequestException("Campaign not found in this organization");
    }
  }
}
