import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BlastStatus, ModuleType, Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { prisma } from "../../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../../lib/queue/queue.constants";
import {
  applyAudienceFilter,
  resolveLinkFieldValues,
} from "./audience-resolver.util";
import { CreateBlastDto, UpdateBlastDto } from "./dto/blast.dto";

type AudienceFilter = {
  filter: Record<string, string>;
  search?: string;
  boardDateFrom?: string;
  boardDateTo?: string;
};

@Injectable()
export class BlastService {
  constructor(
    @InjectQueue(QUEUE_NAMES.BLAST_SEND)
    private readonly blastSendQueue: Queue
  ) {}

  async getBlasts(organizationId: string) {
    return prisma.blast.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { recipients: true } } },
    });
  }

  async getBlast(id: string, organizationId: string) {
    const blast = await prisma.blast.findFirst({
      where: { id, organizationId },
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

    return prisma.blast.create({
      data: {
        name: dto.name,
        campaignId: dto.campaignId ?? null,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        moduleType: dto.moduleType ?? ModuleType.LEAD,
        audienceFilter: dto.audienceFilter as Prisma.InputJsonValue,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        organizationId,
        createdBy: userId,
      },
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

    return prisma.blast.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.campaignId !== undefined && { campaignId: dto.campaignId }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.bodyHtml !== undefined && { bodyHtml: dto.bodyHtml }),
        ...(dto.moduleType !== undefined && { moduleType: dto.moduleType }),
        ...(dto.audienceFilter !== undefined && {
          audienceFilter: dto.audienceFilter as Prisma.InputJsonValue,
        }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
      },
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

  async getAudienceCount(id: string, organizationId: string) {
    const blast = await this.getBlast(id, organizationId);
    const audienceFilter = blast.audienceFilter as unknown as AudienceFilter;
    const { filter, search, boardDateFrom, boardDateTo } = audienceFilter;

    // Field filters and search need the resolved rows; everything else counts in SQL.
    const needsResolvedRows =
      Boolean(search) || Object.keys(filter ?? {}).length > 0;

    if (!needsResolvedRows) {
      const where: Prisma.BoardWhereInput = {
        organizationId,
        moduleType: blast.moduleType,
        isDeleted: false,
      };

      if (boardDateFrom || boardDateTo) {
        where.createdAt = {
          ...(boardDateFrom && { gte: new Date(boardDateFrom) }),
          ...(boardDateTo && { lte: new Date(boardDateTo) }),
        };
      }

      return { count: await prisma.board.count({ where }) };
    }

    const boards = await this.resolveAudience(
      organizationId,
      blast.moduleType,
      audienceFilter
    );

    return { count: boards.length };
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

    const boards = await this.resolveAudience(
      organizationId,
      blast.moduleType,
      blast.audienceFilter as unknown as AudienceFilter
    );

    const emailField = await prisma.field.findFirst({
      where: {
        organizationId,
        moduleType: blast.moduleType,
        fieldType: "EMAIL",
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!emailField) {
      throw new BadRequestException(
        "No EMAIL field found for this organization"
      );
    }

    const recipients = boards
      .map((board) => {
        const emailValue = board.values.find(
          (v) => v.field.id === emailField.id
        )?.value;
        return emailValue ? { recordId: board.id, email: emailValue } : null;
      })
      .filter((r): r is { recordId: string; email: string } => r !== null);

    if (recipients.length === 0) {
      throw new BadRequestException(
        "No recipients with a valid email address were resolved for this audience"
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
