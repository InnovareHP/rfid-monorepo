import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, SenderKind, SenderStatus } from "@prisma/client";
import { appConfig } from "../../../config/app-config";
import {
  deleteDomainIdentity,
  getDomainIdentityStatus,
  provisionDomainIdentity,
} from "../../../lib/aws/ses-identity";
import { prisma } from "../../../lib/prisma/prisma";
import { GmailService } from "../../board/gmail.service";
import { OutlookService } from "../../board/outlook.service";
import { CreateSenderDto, UpdateSenderDto } from "./dto/sender.dto";

@Injectable()
export class SenderService {
  constructor(
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService
  ) {}

  async getSenders(organizationId: string) {
    return prisma.senderIdentity.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { campaigns: true } } },
    });
  }

  async getSender(id: string, organizationId: string) {
    const sender = await prisma.senderIdentity.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { campaigns: true } } },
    });

    if (!sender) throw new NotFoundException("Sender identity not found");

    return sender;
  }

  async createSender(
    dto: CreateSenderDto,
    organizationId: string,
    userId: string
  ) {
    if (dto.kind === "PERSONAL") {
      return this.createPersonal(dto, organizationId, userId);
    }

    const domain =
      dto.kind === "MANAGED_DOMAIN"
        ? `${dto.subdomain}.${this.managedDomain()}`
        : dto.domain;

    if (!domain) {
      throw new BadRequestException("A sending domain is required");
    }

    const existing = await prisma.senderIdentity.findFirst({
      where: { organizationId, domain },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("That domain is already set up here");
    }

    const { dnsRecords } = await provisionDomainIdentity(domain);

    return prisma.senderIdentity.create({
      data: {
        label: dto.label,
        kind: dto.kind,
        fromEmail: `${dto.mailbox}@${domain}`,
        fromName: dto.fromName ?? null,
        // No inbox exists on a sending domain, so replies need somewhere real
        // to land; the creator's own address is the sane default.
        replyTo: dto.replyTo ?? (await this.creatorEmail(userId)),
        domain,
        dnsRecords: dnsRecords as unknown as Prisma.InputJsonValue,
        organizationId,
        createdBy: userId,
      },
    });
  }

  // A personal sender is verified the moment a mailbox is connected: the OAuth
  // grant is the proof, so there is nothing to poll.
  private async createPersonal(
    dto: CreateSenderDto,
    organizationId: string,
    userId: string
  ) {
    const [gmail, outlook] = await Promise.all([
      this.gmailService.getConnectionStatus(userId),
      this.outlookService.getConnectionStatus(userId),
    ]);

    const email = gmail.email ?? outlook.email;

    if (!email) {
      throw new BadRequestException(
        "Connect a Gmail or Outlook mailbox before using it as a sender"
      );
    }

    return prisma.senderIdentity.create({
      data: {
        label: dto.label,
        kind: SenderKind.PERSONAL,
        status: SenderStatus.VERIFIED,
        verifiedAt: new Date(),
        fromEmail: email,
        fromName: dto.fromName ?? null,
        // Mail leaves from that mailbox, so replies already thread back to it.
        replyTo: email,
        mailboxUserId: userId,
        organizationId,
        createdBy: userId,
      },
    });
  }

  private async creatorEmail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  // Reads SES rather than trusting the stored status, so a domain that lost its
  // records stops being verified here too.
  async refreshVerification(id: string, organizationId: string) {
    const sender = await this.getSender(id, organizationId);

    if (!sender.domain) return sender;

    const status = await getDomainIdentityStatus(sender.domain);

    return prisma.senderIdentity.update({
      where: { id },
      data: {
        status: status.verified ? SenderStatus.VERIFIED : SenderStatus.PENDING,
        verifiedAt: status.verified ? (sender.verifiedAt ?? new Date()) : null,
        dnsRecords: status.dnsRecords as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updateSender(id: string, dto: UpdateSenderDto, organizationId: string) {
    await this.getSender(id, organizationId);

    return prisma.senderIdentity.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.fromName !== undefined && { fromName: dto.fromName }),
        ...(dto.replyTo !== undefined && { replyTo: dto.replyTo }),
      },
    });
  }

  async deleteSender(id: string, organizationId: string) {
    const sender = await this.getSender(id, organizationId);

    if (sender._count.campaigns > 0) {
      throw new BadRequestException(
        "This sender is used by a campaign. Point those campaigns elsewhere first."
      );
    }

    // Releasing the SES identity keeps a re-add from colliding with a stale one.
    if (sender.domain) await deleteDomainIdentity(sender.domain);

    await prisma.senderIdentity.delete({ where: { id } });

    return { message: "Sender identity deleted successfully" };
  }

  // Resolved at send time, so a campaign whose domain went unverified since the
  // draft was written fails loudly instead of mailing from the wrong address.
  async resolveForCampaign(campaignId: string, organizationId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { senderIdentity: true },
    });

    const sender = campaign?.senderIdentity;
    if (!sender) return null;

    if (sender.status !== SenderStatus.VERIFIED) {
      throw new BadRequestException(
        `The sender "${sender.label}" is not verified yet`
      );
    }

    return sender;
  }

  private managedDomain() {
    if (!appConfig.SES_MANAGED_DOMAIN) {
      throw new BadRequestException(
        "Managed sending domains are not configured on this deployment"
      );
    }
    return appConfig.SES_MANAGED_DOMAIN;
  }
}
