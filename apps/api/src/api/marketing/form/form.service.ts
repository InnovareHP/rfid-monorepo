import { toSlug } from "@dashboard/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BoardFieldType, ModuleType, PageStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma/prisma";
import { AuditService } from "../../../lib/audit/audit.service";
import { BoardService } from "../../board/board.service";
import { PlacesService } from "../../places/places.service";
import { CreateFormDto, UpdateFormDto } from "./dto/form.dto";

type FieldMapping = {
  fieldId: string;
  label: string;
  required: boolean;
};

@Injectable()
export class FormService {
  constructor(
    private readonly boardService: BoardService,
    private readonly auditService: AuditService,
    private readonly placesService: PlacesService
  ) {}

  async getForms(organizationId: string) {
    return prisma.form.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async getForm(id: string, organizationId: string) {
    const form = await prisma.form.findFirst({
      where: { id, organizationId },
    });

    if (!form) throw new NotFoundException("Form not found");

    return form;
  }

  async getFormFields(id: string, organizationId: string) {
    const form = await this.getForm(id, organizationId);

    const fields = await prisma.field.findMany({
      where: {
        organizationId,
        moduleType: form.moduleType,
        isDeleted: false,
      },
      orderBy: { fieldOrder: "asc" },
      select: {
        id: true,
        fieldName: true,
        fieldType: true,
        fieldOrder: true,
        options: {
          where: { isDeleted: false },
          orderBy: { optionOrder: "asc" },
          select: { optionName: true },
        },
      },
    });

    return fields.map((field) => ({
      ...field,
      options: field.options.map((option) => option.optionName),
    }));
  }

  async createForm(dto: CreateFormDto, organizationId: string, userId: string) {
    const slug = await this.generateUniqueSlug(dto.name);

    try {
      return await this.persistForm(dto, organizationId, userId, slug);
    } catch (error) {
      if (!this.isSlugConflict(error)) throw error;

      // Race condition safety net: another request took this slug between
      // our uniqueness check and the create — pick a fresh one and retry once.
      const retrySlug = await this.generateUniqueSlug(dto.name);
      return await this.persistForm(dto, organizationId, userId, retrySlug);
    }
  }

  async updateForm(id: string, dto: UpdateFormDto, organizationId: string) {
    await this.getForm(id, organizationId);

    return prisma.form.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.campaignId !== undefined && { campaignId: dto.campaignId }),
        ...(dto.moduleType !== undefined && { moduleType: dto.moduleType }),
        ...(dto.fieldMappings !== undefined && {
          fieldMappings: dto.fieldMappings as Prisma.InputJsonValue,
        }),
        ...(dto.submitButtonText !== undefined && {
          submitButtonText: dto.submitButtonText,
        }),
        ...(dto.redirectUrl !== undefined && {
          redirectUrl: dto.redirectUrl,
        }),
      },
    });
  }

  async publishForm(id: string, organizationId: string) {
    await this.getForm(id, organizationId);

    return prisma.form.update({
      where: { id },
      data: { status: PageStatus.PUBLISHED },
    });
  }

  async deleteForm(id: string, organizationId: string) {
    await this.getForm(id, organizationId);

    await prisma.form.delete({ where: { id } });

    return { message: "Form deleted successfully" };
  }

  async getPublicForm(slug: string) {
    const form = await prisma.form.findUnique({
      where: { slug, status: PageStatus.PUBLISHED },
    });

    if (!form) throw new NotFoundException("Form not found");

    return this.buildPublicFormResponse(form);
  }

  // Used when a form is embedded in a landing page: organizationId is passed
  // for defense-in-depth even though formId is never client-controlled here
  // (it comes from the already org-validated LandingPage.formId column).
  // Returns null instead of throwing so a missing/unpublished form degrades
  // the landing page gracefully rather than failing the whole page.
  async getPublicFormById(id: string, organizationId: string) {
    const form = await prisma.form.findUnique({
      where: { id, status: PageStatus.PUBLISHED },
    });

    if (!form || form.organizationId !== organizationId) return null;

    return { ...(await this.buildPublicFormResponse(form)), slug: form.slug };
  }

  private async buildPublicFormResponse(form: {
    id: string;
    name: string;
    submitButtonText: string;
    fieldMappings: Prisma.JsonValue;
    organizationId: string;
  }) {
    const fieldMappings = form.fieldMappings as FieldMapping[];
    const fieldIds = fieldMappings.map((m) => m.fieldId);

    const fields = fieldIds.length
      ? await prisma.field.findMany({
          where: { id: { in: fieldIds }, organizationId: form.organizationId },
          select: {
            id: true,
            fieldType: true,
            options: {
              where: { isDeleted: false },
              orderBy: { optionOrder: "asc" },
              select: { optionName: true },
            },
          },
        })
      : [];
    const fieldById = new Map(fields.map((f) => [f.id, f]));

    return {
      id: form.id,
      name: form.name,
      submitButtonText: form.submitButtonText,
      fieldMappings: fieldMappings.map((m) => {
        const field = fieldById.get(m.fieldId);

        return {
          fieldId: m.fieldId,
          label: m.label,
          required: m.required,
          fieldType: field?.fieldType ?? "TEXT",
          options: (field?.options ?? []).map((o) => o.optionName),
        };
      }),
    };
  }

  async autocompletePublicFormPlaces(slug: string, input: string) {
    await this.assertPublicFormHasLocation(slug);

    return this.placesService.autocomplete(input);
  }

  async getPublicFormPlaceDetails(slug: string, placeId: string) {
    await this.assertPublicFormHasLocation(slug);

    return this.placesService.getPlaceDetails(placeId);
  }

  // The geocoder is metered, so an anonymous caller only reaches it through a
  // published form that actually renders a LOCATION field.
  private async assertPublicFormHasLocation(slug: string) {
    const form = await prisma.form.findUnique({
      where: { slug, status: PageStatus.PUBLISHED },
      select: { organizationId: true, fieldMappings: true },
    });

    if (!form) throw new NotFoundException("Form not found");

    const fieldIds = (form.fieldMappings as FieldMapping[]).map(
      (m) => m.fieldId
    );

    const locationField = await prisma.field.findFirst({
      where: {
        id: { in: fieldIds },
        organizationId: form.organizationId,
        fieldType: BoardFieldType.LOCATION,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!locationField) throw new NotFoundException("Form not found");
  }

  async submitPublicForm(
    slug: string,
    values: Record<string, unknown>,
    meta: { ip?: string; userAgent?: string }
  ) {
    const form = await prisma.form.findUnique({
      where: { slug, status: PageStatus.PUBLISHED },
    });

    if (!form) throw new NotFoundException("Form not found");

    const { organizationId, moduleType } = form;
    const fieldMappings = form.fieldMappings as FieldMapping[];

    if (
      typeof values !== "object" ||
      values === null ||
      Array.isArray(values)
    ) {
      throw new BadRequestException("Invalid submission payload");
    }

    // Allowlist: only fieldIds present on this form's mapping may be set —
    // an anonymous submitter must never write a value for any other field.
    const filteredValues: Record<string, string | null> = {};
    for (const mapping of fieldMappings) {
      if (Object.prototype.hasOwnProperty.call(values, mapping.fieldId)) {
        const value = values[mapping.fieldId];

        if (
          value !== null &&
          value !== undefined &&
          typeof value !== "string"
        ) {
          throw new BadRequestException(
            `Invalid value for field: ${mapping.fieldId}`
          );
        }

        filteredValues[mapping.fieldId] = value ?? null;
      }
    }

    const missingRequired = fieldMappings
      .filter((m) => m.required)
      .filter((m) => {
        const value = filteredValues[m.fieldId];
        return value === undefined || value === null || value === "";
      })
      .map((m) => m.fieldId);

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingRequired.join(", ")}`
      );
    }

    const board = await prisma.$transaction(async (tx) => {
      const record = await this.boardService.insertBoardRecord(tx, {
        recordName: form.name,
        organizationId,
        memberId: null,
        moduleType,
        initialValues: filteredValues,
      });

      await tx.formSubmission.create({
        data: {
          formId: form.id,
          recordId: record.id,
          sourceIp: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });

      return record;
    });

    await this.boardService.afterRecordCreated(
      board,
      organizationId,
      moduleType
    );

    await this.auditService.record({
      actorOrgId: organizationId,
      action: "marketing.form.submit",
      resourceType: "Board",
      resourceId: board.id,
      actorIp: meta.ip ?? null,
      actorUserAgent: meta.userAgent ?? null,
      metadata: { formId: form.id, slug },
    });

    return {
      success: true,
      recordId: board.id,
      redirectUrl: form.redirectUrl,
    };
  }

  private async persistForm(
    dto: CreateFormDto,
    organizationId: string,
    userId: string,
    slug: string
  ) {
    return prisma.form.create({
      data: {
        name: dto.name,
        slug,
        organizationId,
        campaignId: dto.campaignId ?? null,
        moduleType: (dto.moduleType ?? ModuleType.LEAD) as ModuleType,
        fieldMappings: dto.fieldMappings as Prisma.InputJsonValue,
        submitButtonText: dto.submitButtonText ?? "Submit",
        redirectUrl: dto.redirectUrl ?? null,
        createdBy: userId,
      },
    });
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = toSlug(name) || "form";
    let candidate = base;
    let suffix = 2;

    while (await prisma.form.findUnique({ where: { slug: candidate } })) {
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
