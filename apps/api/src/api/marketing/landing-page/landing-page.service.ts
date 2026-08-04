import { toSlug } from "@dashboard/shared";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PageStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma/prisma";
import { FormService } from "../form/form.service";
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
} from "./dto/landing-page.dto";
import {
  LandingSection,
  LandingSectionSchema,
} from "./dto/landing-page.schema";

@Injectable()
export class LandingPageService {
  private readonly logger = new Logger(LandingPageService.name);

  constructor(private readonly formService: FormService) {}

  async listLandingPages(organizationId: string) {
    return prisma.landingPage.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLandingPage(id: string, organizationId: string) {
    const page = await prisma.landingPage.findFirst({
      where: { id, organizationId },
    });

    if (!page) throw new NotFoundException("Landing page not found");

    return page;
  }

  async createLandingPage(
    dto: CreateLandingPageDto,
    organizationId: string,
    userId: string
  ) {
    const slug = await this.generateUniqueSlug(dto.name);

    try {
      return await this.persistLandingPage(dto, organizationId, userId, slug);
    } catch (error) {
      if (!this.isSlugConflict(error)) throw error;

      // Race condition safety net: another request took this slug between
      // our uniqueness check and the create — pick a fresh one and retry once.
      const retrySlug = await this.generateUniqueSlug(dto.name);
      return await this.persistLandingPage(
        dto,
        organizationId,
        userId,
        retrySlug
      );
    }
  }

  async updateLandingPage(
    id: string,
    dto: UpdateLandingPageDto,
    organizationId: string
  ) {
    const existing = await this.getLandingPage(id, organizationId);
    const sections =
      dto.sections ?? (existing.sections as unknown as LandingSection[]);
    const formId = this.resolveFormId(sections, dto.formId, existing.formId);

    await this.validateFormReference(sections, formId, organizationId);

    // Slugs are globally unique — changing one also changes the public URL.
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const taken = await prisma.landingPage.findUnique({
        where: { slug: dto.slug },
      });

      if (taken)
        throw new BadRequestException("That URL slug is already taken");
    }

    try {
      return await prisma.landingPage.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.campaignId !== undefined && { campaignId: dto.campaignId }),
          ...(dto.sections !== undefined && {
            sections: sections as Prisma.InputJsonValue,
          }),
          formId,
          ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle }),
          ...(dto.seoDescription !== undefined && {
            seoDescription: dto.seoDescription,
          }),
        },
      });
    } catch (error) {
      if (!this.isSlugConflict(error)) throw error;

      throw new BadRequestException("That URL slug is already taken");
    }
  }

  async publishLandingPage(id: string, organizationId: string) {
    await this.getLandingPage(id, organizationId);

    return prisma.landingPage.update({
      where: { id },
      data: { status: PageStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async deleteLandingPage(id: string, organizationId: string) {
    await this.getLandingPage(id, organizationId);

    await prisma.landingPage.delete({ where: { id } });

    return { message: "Landing page deleted successfully" };
  }

  async getPublicPage(slug: string) {
    const page = await prisma.landingPage.findUnique({
      where: { slug, status: PageStatus.PUBLISHED },
    });

    if (!page) throw new NotFoundException("Page not found");

    const rawSections = Array.isArray(page.sections) ? page.sections : [];
    const sections: LandingSection[] = [];

    for (const raw of rawSections) {
      const parsed = LandingSectionSchema.safeParse(raw);
      if (parsed.success) {
        sections.push(parsed.data);
      } else {
        this.logger.warn(
          `Dropping invalid section on landing page "${slug}": ${parsed.error.message}`
        );
      }
    }

    const embeddedForm = page.formId
      ? await this.formService.getPublicFormById(
          page.formId,
          page.organizationId
        )
      : null;

    return {
      id: page.id,
      name: page.name,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      sections,
      embeddedForm,
    };
  }

  private async persistLandingPage(
    dto: CreateLandingPageDto,
    organizationId: string,
    userId: string,
    slug: string
  ) {
    const sections = dto.sections ?? [];
    const formId = this.resolveFormId(sections, dto.formId, null);

    await this.validateFormReference(sections, formId, organizationId);

    return prisma.landingPage.create({
      data: {
        name: dto.name,
        slug,
        organizationId,
        campaignId: dto.campaignId ?? null,
        sections: sections as Prisma.InputJsonValue,
        formId,
        seoTitle: dto.seoTitle ?? null,
        seoDescription: dto.seoDescription ?? null,
        createdBy: userId,
      },
    });
  }

  // formId only persists when a FORM_EMBED section exists — nulled otherwise,
  // regardless of what the client sent, on both create and update.
  private resolveFormId(
    sections: LandingSection[],
    dtoFormId: string | undefined,
    existingFormId: string | null
  ): string | null {
    const hasFormEmbed = sections.some(
      (section) => section.type === "FORM_EMBED"
    );

    if (!hasFormEmbed) return null;

    return dtoFormId ?? existingFormId ?? null;
  }

  private async validateFormReference(
    sections: LandingSection[],
    formId: string | null,
    organizationId: string
  ) {
    const formEmbedCount = sections.filter(
      (section) => section.type === "FORM_EMBED"
    ).length;

    if (formEmbedCount > 1) {
      throw new BadRequestException("A landing page can only embed one form");
    }

    if (formEmbedCount === 0) return;

    if (!formId) {
      throw new BadRequestException(
        "A form must be selected for the embedded form section"
      );
    }

    const form = await prisma.form.findFirst({
      where: { id: formId, organizationId },
    });

    if (!form) {
      throw new BadRequestException("Selected form not found");
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = toSlug(name) || "page";
    let candidate = base;
    let suffix = 2;

    while (
      await prisma.landingPage.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private isSlugConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }
}
