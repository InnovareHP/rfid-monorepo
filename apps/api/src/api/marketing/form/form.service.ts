import { FORM_RECORD_NAME_FIELD_ID, toSlug } from "@dashboard/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BoardFieldType, PageStatus, Prisma } from "@prisma/client";
import {
  resolveModuleId,
  toModuleType,
} from "../../../lib/module/system-modules";
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

// The record name question is pinned first and always required: without it
// every submission would fall back to the form name and collide on the
// unique-name guard, so only the first one would ever create a record.
const withRecordNameMapping = (
  fieldMappings: FieldMapping[],
  label: string
): FieldMapping[] => {
  const existing = fieldMappings.find(
    (mapping) => mapping.fieldId === FORM_RECORD_NAME_FIELD_ID
  );

  return [
    { fieldId: FORM_RECORD_NAME_FIELD_ID, label, ...existing, required: true },
    ...fieldMappings.filter(
      (mapping) => mapping.fieldId !== FORM_RECORD_NAME_FIELD_ID
    ),
  ];
};

// Slugs are unique per organization, so the organization slug is half the key
// a public URL needs and the lookup is meaningless without it.
const publishedFormWhere = (orgSlug: string, slug: string) => ({
  slug,
  status: PageStatus.PUBLISHED,
  organization: { slug: orgSlug },
});

// The builder renders the public URL, and it cannot without the org half.
const withOrgSlug = <T extends { organization: { slug: string | null } }>({
  organization,
  ...row
}: T) => ({ ...row, orgSlug: organization.slug });

// The wire always carries the module key. The enum column reads CUSTOM for
// every organization-defined module, so it is internal to writes.
const withModuleKey = <
  T extends { moduleType: string; module?: { key: string } | null },
>(
  row: T
) => ({ ...row, moduleType: row.module?.key ?? row.moduleType });

@Injectable()
export class FormService {
  constructor(
    private readonly boardService: BoardService,
    private readonly auditService: AuditService,
    private readonly placesService: PlacesService
  ) {}

  async getForms(organizationId: string) {
    const forms = await prisma.form.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { submissions: true } },
        module: { select: { key: true } },
        organization: { select: { slug: true } },
      },
    });

    return forms.map(withOrgSlug).map(withModuleKey);
  }

  async getForm(id: string, organizationId: string) {
    const form = await prisma.form.findFirst({
      where: { id, organizationId },
      include: {
        module: { select: { key: true } },
        organization: { select: { slug: true } },
      },
    });

    if (!form) throw new NotFoundException("Form not found");

    return {
      ...withModuleKey(withOrgSlug(form)),
      fieldMappings: withRecordNameMapping(
        form.fieldMappings as FieldMapping[],
        await this.recordNameLabel(form.moduleId)
      ),
    };
  }

  // Custom modules name their record type, so the default question label
  // follows the module rather than saying "Record" everywhere.
  private async recordNameLabel(moduleId: string | null) {
    const module = moduleId
      ? await prisma.module.findUnique({
          where: { id: moduleId },
          select: { labelSingular: true },
        })
      : null;

    return `${module?.labelSingular ?? "Record"} Name`;
  }

  // A mapping pointing at another module's field silently writes nothing: the
  // record insert only fills fields of its own module, so the submitted value
  // is dropped on the floor.
  private async findOrphanMappingFieldIds(
    fieldMappings: FieldMapping[],
    moduleId: string | null,
    organizationId: string
  ) {
    const fieldIds = [
      ...new Set(
        fieldMappings
          .map((mapping) => mapping.fieldId)
          .filter((fieldId) => fieldId !== FORM_RECORD_NAME_FIELD_ID)
      ),
    ];

    if (fieldIds.length === 0) return [];

    const onModule = await prisma.field.findMany({
      where: {
        id: { in: fieldIds },
        organizationId,
        moduleId,
        isDeleted: false,
      },
      select: { id: true },
    });

    const onModuleIds = new Set(onModule.map((field) => field.id));

    return fieldIds.filter((fieldId) => !onModuleIds.has(fieldId));
  }

  private async assertMappingsOnModule(
    fieldMappings: FieldMapping[],
    moduleId: string | null,
    organizationId: string
  ) {
    const orphans = await this.findOrphanMappingFieldIds(
      fieldMappings,
      moduleId,
      organizationId
    );

    if (orphans.length > 0) {
      throw new BadRequestException(
        "Every form field must belong to the board this form submits to"
      );
    }
  }

  async getFormFields(id: string, organizationId: string) {
    const form = await this.getForm(id, organizationId);

    const fields = await prisma.field.findMany({
      where: {
        organizationId,
        moduleId: form.moduleId,
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
    const slug = await this.generateUniqueSlug(dto.name, organizationId);

    try {
      return await this.persistForm(dto, organizationId, userId, slug);
    } catch (error) {
      if (!this.isSlugConflict(error)) throw error;

      // Race condition safety net: another request took this slug between
      // our uniqueness check and the create — pick a fresh one and retry once.
      const retrySlug = await this.generateUniqueSlug(dto.name, organizationId);
      return await this.persistForm(dto, organizationId, userId, retrySlug);
    }
  }

  async updateForm(id: string, dto: UpdateFormDto, organizationId: string) {
    const form = await this.getForm(id, organizationId);

    const moduleId =
      dto.moduleType !== undefined
        ? await resolveModuleId(dto.moduleType, organizationId)
        : form.moduleId;

    await this.assertMappingsOnModule(
      dto.fieldMappings ?? form.fieldMappings,
      moduleId,
      organizationId
    );

    return prisma.form.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.campaignId !== undefined && { campaignId: dto.campaignId }),
        ...(dto.moduleType !== undefined && {
          moduleType: toModuleType(dto.moduleType),
          moduleId,
        }),
        ...(dto.fieldMappings !== undefined && {
          fieldMappings: withRecordNameMapping(
            dto.fieldMappings,
            await this.recordNameLabel(moduleId)
          ) as unknown as Prisma.InputJsonValue,
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

  async getPublicForm(orgSlug: string, slug: string) {
    const form = await prisma.form.findFirst({
      where: publishedFormWhere(orgSlug, slug),
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
      include: { organization: { select: { slug: true } } },
    });

    if (!form || form.organizationId !== organizationId) return null;

    // Both halves of the public key, so the embed can post back on its own.
    return {
      ...(await this.buildPublicFormResponse(form)),
      orgSlug: form.organization.slug,
      slug: form.slug,
    };
  }

  private async buildPublicFormResponse(form: {
    id: string;
    name: string;
    submitButtonText: string;
    fieldMappings: Prisma.JsonValue;
    organizationId: string;
    moduleId: string | null;
  }) {
    const fieldMappings = withRecordNameMapping(
      form.fieldMappings as FieldMapping[],
      await this.recordNameLabel(form.moduleId)
    );
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

  async autocompletePublicFormPlaces(
    orgSlug: string,
    slug: string,
    input: string
  ) {
    await this.assertPublicFormHasLocation(orgSlug, slug);

    return this.placesService.autocomplete(input);
  }

  async getPublicFormPlaceDetails(
    orgSlug: string,
    slug: string,
    placeId: string
  ) {
    await this.assertPublicFormHasLocation(orgSlug, slug);

    return this.placesService.getPlaceDetails(placeId);
  }

  // The geocoder is metered, so an anonymous caller only reaches it through a
  // published form that actually renders a LOCATION field.
  private async assertPublicFormHasLocation(orgSlug: string, slug: string) {
    const form = await prisma.form.findFirst({
      where: publishedFormWhere(orgSlug, slug),
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
    orgSlug: string,
    slug: string,
    values: Record<string, unknown>,
    meta: { ip?: string; userAgent?: string }
  ) {
    const form = await prisma.form.findFirst({
      where: publishedFormWhere(orgSlug, slug),
      include: { module: { select: { key: true } } },
    });

    if (!form) throw new NotFoundException("Form not found");

    // The stored enum reads CUSTOM for every organization-defined module, so
    // the key has to come off the relation or the record has no module.
    const { organizationId } = form;
    const moduleType = form.module?.key ?? form.moduleType;
    const fieldMappings = withRecordNameMapping(
      form.fieldMappings as FieldMapping[],
      await this.recordNameLabel(form.moduleId)
    );

    if (
      typeof values !== "object" ||
      values === null ||
      Array.isArray(values)
    ) {
      throw new BadRequestException("Invalid submission payload");
    }

    // Fail loudly rather than create a record with the answers dropped: a
    // mapping can outlive the field it names, or the board it was drawn from.
    const orphans = await this.findOrphanMappingFieldIds(
      fieldMappings,
      form.moduleId,
      organizationId
    );

    if (orphans.length > 0) {
      throw new BadRequestException(
        "This form is misconfigured and cannot accept submissions"
      );
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

    // The name question is not a Field, so it names the record instead of
    // being written as a value.
    const recordName = filteredValues[FORM_RECORD_NAME_FIELD_ID] ?? "";
    delete filteredValues[FORM_RECORD_NAME_FIELD_ID];

    // The unique-name guard scans and decrypts the module's record names, so
    // it runs before the transaction rather than inside its 5s window.
    await this.boardService.assertNewRecordNameAvailable(
      organizationId,
      moduleType,
      recordName
    );

    const board = await prisma.$transaction(async (tx) => {
      const record = await this.boardService.insertBoardRecord(tx, {
        recordName,
        organizationId,
        memberId: null,
        moduleType,
        initialValues: filteredValues,
      });

      // Public submit runs @CrossTenant, so the extension injects nothing here
      // and the organization has to be named outright.
      await tx.formSubmission.create({
        data: {
          formId: form.id,
          recordId: record.id,
          organizationId,
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
    const moduleKey = dto.moduleType ?? "LEAD";
    const moduleId = await resolveModuleId(moduleKey, organizationId);

    await this.assertMappingsOnModule(
      dto.fieldMappings,
      moduleId,
      organizationId
    );

    return prisma.form.create({
      data: {
        name: dto.name,
        slug,
        organizationId,
        campaignId: dto.campaignId ?? null,
        moduleType: toModuleType(moduleKey),
        moduleId,
        fieldMappings: withRecordNameMapping(
          dto.fieldMappings,
          await this.recordNameLabel(moduleId)
        ) as unknown as Prisma.InputJsonValue,
        submitButtonText: dto.submitButtonText ?? "Submit",
        redirectUrl: dto.redirectUrl ?? null,
        createdBy: userId,
      },
    });
  }

  private async generateUniqueSlug(
    name: string,
    organizationId: string
  ): Promise<string> {
    const base = toSlug(name) || "form";
    let candidate = base;
    let suffix = 2;

    while (
      await prisma.form.findFirst({
        where: { slug: candidate, organizationId },
        select: { id: true },
      })
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
