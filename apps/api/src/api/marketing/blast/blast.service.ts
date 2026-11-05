import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BlastEditorType, BlastStatus, Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { prisma } from "../../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../../lib/queue/queue.constants";
import { EmailDispatchService } from "../../board/email-dispatch.service";
import { GroupService } from "../group/group.service";
import { SenderService } from "../sender/sender.service";
import { SubscriberService } from "../subscriber/subscriber.service";
import {
  applyMergeVariables,
  renderBlastHtml,
  sanitizeRichText,
  wrapClassicHtml,
  type BlastBlock,
} from "./blast-html";
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
    private readonly groupService: GroupService,
    private readonly senderService: SenderService,
    private readonly emailDispatchService: EmailDispatchService,
    private readonly subscriberService: SubscriberService
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

    const editorType = dto.editorType ?? BlastEditorType.DRAG_DROP;
    const blocks = dto.blocks ?? [];

    return prisma.blast.create({
      data: {
        name: dto.name,
        campaignId: dto.campaignId ?? null,
        subject: dto.subject,
        editorType,
        ...this.resolveBody(editorType, {
          bodyHtml: dto.bodyHtml,
          blocks,
        }),
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

    // The editor a blast was created with is fixed, so the body always resolves
    // against the stored type rather than whatever the client sends.
    const bodyChanged = dto.bodyHtml !== undefined || dto.blocks !== undefined;

    return prisma.blast.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.campaignId !== undefined && { campaignId: dto.campaignId }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(bodyChanged &&
          this.resolveBody(blast.editorType, {
            bodyHtml: dto.bodyHtml ?? blast.bodyHtml,
            blocks: dto.blocks ?? this.readBlocks(blast.bodyJson),
          })),
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

    // Checked before the status flips: an unverified sender discovered inside
    // the job would leave the blast stuck in SENDING with nothing sent.
    if (blast.campaignId) {
      await this.senderService.resolveForCampaign(
        blast.campaignId,
        organizationId
      );
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
        subscriberId: r.subscriberId,
        organizationId,
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

  // Sends the blast as-is to one address so the author can proof it. No
  // recipient rows, no status change, so a test never consumes the send path.
  async sendTest(
    id: string,
    organizationId: string,
    userId: string,
    to: string,
    sendVia?: string
  ) {
    const blast = await this.getBlast(id, organizationId);
    const [organization, creator] = await Promise.all([
      prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { name: true },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true },
      }),
    ]);

    const sender = blast.campaignId
      ? await this.senderService.resolveForCampaign(
          blast.campaignId,
          organizationId
        )
      : null;

    // The test carries a real unsubscribe link so the footer can be proofed.
    const documentHtml =
      blast.editorType === BlastEditorType.CLASSIC
        ? wrapClassicHtml(blast.bodyHtml, organization.name)
        : blast.bodyHtml;

    await this.emailDispatchService.send({
      userId,
      to,
      subject: `[Test] ${blast.subject}`,
      recipientName: creator.name,
      body: applyMergeVariables(documentHtml, {
        recordName: creator.name,
        email: to,
        organizationName: organization.name,
        unsubscribeUrl: this.subscriberService.unsubscribeUrl(
          organizationId,
          to
        ),
        subscribeUrl: this.subscriberService.subscribeUrl(organizationId),
      }),
      layout: "NONE",
      senderName: sender?.fromName ?? creator.name,
      sendVia,
      sender: sender
        ? {
            kind: sender.kind,
            fromEmail: sender.fromEmail,
            fromName: sender.fromName,
            replyTo: sender.replyTo,
            mailboxUserId: sender.mailboxUserId,
          }
        : undefined,
    });

    return { message: "Test email sent" };
  }

  private readBlocks(bodyJson: Prisma.JsonValue | null): BlastBlock[] {
    return Array.isArray(bodyJson) ? (bodyJson as BlastBlock[]) : [];
  }

  // bodyHtml is the only thing the send path reads, so drag and drop blasts
  // render it here instead of trusting whatever the client composed.
  private resolveBody(
    editorType: BlastEditorType,
    input: { bodyHtml: string; blocks: BlastBlock[] }
  ) {
    if (editorType === BlastEditorType.CLASSIC) {
      return {
        bodyHtml: sanitizeRichText(input.bodyHtml),
        bodyJson: Prisma.DbNull,
      };
    }

    return {
      bodyHtml: renderBlastHtml(input.blocks),
      bodyJson: input.blocks as unknown as Prisma.InputJsonValue,
    };
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
