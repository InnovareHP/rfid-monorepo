import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CampaignStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma/prisma";
import { CreateCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Injectable()
export class CampaignService {
  async getCampaigns(organizationId: string) {
    return prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { forms: true, blasts: true, landingPages: true } },
        senderIdentity: {
          select: { id: true, label: true, kind: true, status: true, fromEmail: true },
        },
      },
    });
  }

  async getCampaign(id: string, organizationId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) throw new NotFoundException("Campaign not found");

    return campaign;
  }

  async createCampaign(
    dto: CreateCampaignDto,
    organizationId: string,
    userId: string
  ) {
    if (dto.senderIdentityId) {
      await this.assertSenderInOrg(dto.senderIdentityId, organizationId);
    }

    return prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        senderIdentityId: dto.senderIdentityId ?? null,
        organizationId,
        createdBy: userId,
      },
    });
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    organizationId: string
  ) {
    await this.getCampaign(id, organizationId);

    if (dto.senderIdentityId) {
      await this.assertSenderInOrg(dto.senderIdentityId, organizationId);
    }

    return prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.senderIdentityId !== undefined && {
          senderIdentityId: dto.senderIdentityId,
        }),
      },
    });
  }

  async archiveCampaign(id: string, organizationId: string) {
    await this.getCampaign(id, organizationId);

    return prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ARCHIVED },
    });
  }

  async deleteCampaign(id: string, organizationId: string) {
    await this.getCampaign(id, organizationId);

    const [blastCount, formCount, landingPageCount] = await Promise.all([
      prisma.blast.count({ where: { campaignId: id } }),
      prisma.form.count({ where: { campaignId: id } }),
      prisma.landingPage.count({ where: { campaignId: id } }),
    ]);

    if (blastCount > 0 || formCount > 0 || landingPageCount > 0) {
      throw new BadRequestException(
        "Campaign has associated blasts, forms, or landing pages — archive it or remove the children first"
      );
    }

    await prisma.campaign.delete({ where: { id } });

    return { message: "Campaign deleted successfully" };
  }

  private async assertSenderInOrg(
    senderIdentityId: string,
    organizationId: string
  ) {
    const sender = await prisma.senderIdentity.findFirst({
      where: { id: senderIdentityId, organizationId },
      select: { id: true },
    });

    if (!sender) {
      throw new BadRequestException(
        "Sender identity not found in this organization"
      );
    }
  }
}
