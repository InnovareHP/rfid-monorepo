import {
  BAA_ACKNOWLEDGEMENT,
  BAA_CLAUSES,
  BAA_ENTITY_TYPES,
  BAA_VERSION,
  entitlementHasFeature,
  isBaaCurrent,
} from "@dashboard/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AgreementKind } from "@prisma/client";
import { getOrganizationEntitlement } from "../../guard/subscription/subscription.guard";
import {
  getHipaaSettings,
  hasSecondFactor,
  invalidateHipaaCache,
} from "../../guard/hipaa/hipaa.guard";
import { AuditService } from "../../lib/audit/audit.service";
import { renderBlankBaa, renderExecutedBaa } from "../../lib/documents/baa-pdf";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped } from "../../lib/prisma/tenant-context";
import {
  PurgeOrganizationDataInput,
  SignBaaInput,
  UpdateComplianceSettingsInput,
} from "./dto/compliance.dto";

export type SignerContext = {
  userId: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
};

@Injectable()
export class ComplianceService {
  constructor(private readonly audit: AuditService) {}

  // Organization has no organizationId column, so the tenant extension cannot
  // scope it; the id in the where clause is the scope.
  private organization(organizationId: string) {
    return runUnscoped(() =>
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          name: true,
          hipaaEnabled: true,
          baaAcceptedAt: true,
          baaVersion: true,
          retentionDays: true,
          ipAllowlist: true,
        },
      })
    );
  }

  // Selects around the document column so a status read does not load the PDF.
  private currentAgreement(organizationId: string) {
    return prisma.contractAgreement.findFirst({
      where: {
        organizationId,
        kind: AgreementKind.BAA,
        termsVersion: BAA_VERSION,
      },
      select: {
        id: true,
        companyLegalName: true,
        signerName: true,
        signerTitle: true,
        acceptanceMethod: true,
      },
      orderBy: { signedAt: "desc" },
    });
  }

  // Every member reads this, not just the ones who can manage compliance: it
  // is what tells the app whether to stand in front of the user and ask for a
  // second factor. It answers with the same rule HipaaGuard enforces, so the
  // modal cannot disagree with the 403 the API would return.
  async getSecondFactorRequirement(organizationId: string, userId: string) {
    const settings = await getHipaaSettings(organizationId);

    if (!settings?.hipaaEnabled) {
      return { required: false, satisfied: true };
    }

    return {
      required: true,
      satisfied: await hasSecondFactor(userId, true),
    };
  }

  async getStatus(organizationId: string) {
    const organization = await this.organization(organizationId);
    if (!organization) throw new NotFoundException("Organization not found");

    const entitlement = await getOrganizationEntitlement(organizationId);
    const agreement = await this.currentAgreement(organizationId);
    const signed = isBaaCurrent(
      organization.baaAcceptedAt,
      organization.baaVersion
    );

    return {
      hipaaEnabled: organization.hipaaEnabled,
      retentionDays: organization.retentionDays,
      ipAllowlist: organization.ipAllowlist,
      planSupportsHipaa: entitlementHasFeature(entitlement, "hipaa"),
      baa: {
        version: BAA_VERSION,
        signed,
        // Signed an earlier version: the gate treats this as unsigned, and the
        // UI says so rather than showing a green check.
        stale: Boolean(organization.baaAcceptedAt) && !signed,
        acceptedAt: organization.baaAcceptedAt,
        acceptedVersion: organization.baaVersion,
        // An offline-recorded agreement has no rendered PDF behind it.
        documentAvailable: agreement?.acceptanceMethod === "signature",
        companyLegalName: agreement?.companyLegalName ?? null,
        signerName: agreement?.signerName ?? null,
        signerTitle: agreement?.signerTitle ?? null,
        acceptanceMethod: agreement?.acceptanceMethod ?? null,
      },
    };
  }

  async getTerms(organizationId: string) {
    const entitlement = await getOrganizationEntitlement(organizationId);

    return {
      version: BAA_VERSION,
      clauses: BAA_CLAUSES,
      acknowledgement: BAA_ACKNOWLEDGEMENT,
      entityTypes: BAA_ENTITY_TYPES,
      planSupportsHipaa: entitlementHasFeature(entitlement, "hipaa"),
    };
  }

  getBlankDocument() {
    return renderBlankBaa();
  }

  async updateSettings(
    organizationId: string,
    input: UpdateComplianceSettingsInput,
    signer: SignerContext
  ) {
    const organization = await this.organization(organizationId);
    if (!organization) throw new NotFoundException("Organization not found");

    // Turning HIPAA mode off would silently drop the safeguards the data
    // captured under it was promised, so the app has no path back.
    if (input.hipaaEnabled === false && organization.hipaaEnabled) {
      throw new ConflictException(
        "HIPAA mode cannot be disabled from the app. Contact support."
      );
    }

    await runUnscoped(() =>
      prisma.organization.update({
        where: { id: organizationId },
        data: {
          hipaaEnabled: input.hipaaEnabled ?? organization.hipaaEnabled,
          retentionDays: input.retentionDays ?? organization.retentionDays,
          ipAllowlist: input.ipAllowlist ?? organization.ipAllowlist,
        },
      })
    );

    await invalidateHipaaCache(organizationId);

    await this.audit.record({
      actorUserId: signer.userId,
      actorOrgId: organizationId,
      actorIp: signer.ipAddress,
      action: "COMPLIANCE_SETTINGS_UPDATED",
      resourceType: "Organization",
      resourceId: organizationId,
      metadata: {
        hipaaEnabled: input.hipaaEnabled ?? organization.hipaaEnabled,
        retentionDays: input.retentionDays ?? organization.retentionDays,
        ipAllowlistSize: (input.ipAllowlist ?? organization.ipAllowlist).length,
      },
    });

    return this.getStatus(organizationId);
  }

  async sign(
    organizationId: string,
    input: SignBaaInput,
    signer: SignerContext
  ) {
    const entitlement = await getOrganizationEntitlement(organizationId);
    if (!entitlementHasFeature(entitlement, "hipaa")) {
      throw new ForbiddenException(
        "A Business Associate Agreement requires the Scale plan"
      );
    }

    // Re-submitting the same version echoes the existing record rather than
    // stacking a second execution against one agreement.
    const existing = await this.currentAgreement(organizationId);
    if (existing) return this.getStatus(organizationId);

    const organization = await this.organization(organizationId);
    if (!organization) throw new NotFoundException("Organization not found");

    const signedAt = new Date();
    const party = {
      companyLegalName: input.companyLegalName,
      companyJurisdiction: input.companyJurisdiction,
      companyEntityType: input.companyEntityType,
      companyAddress: input.companyAddress,
    };

    const document = await renderExecutedBaa({
      party,
      signerName: input.signerName,
      signerTitle: input.signerTitle,
      signerEmail: signer.email,
      organizationName: organization.name,
      signatureImage: input.signature,
      ipAddress: signer.ipAddress,
      signedAt,
    });

    // The row and the organization mirror the gate reads must land together, or
    // a crash between them leaves an org that signed but stays blocked.
    await prisma.$transaction(async (tx) => {
      await tx.contractAgreement.create({
        data: {
          organizationId,
          kind: AgreementKind.BAA,
          termsVersion: BAA_VERSION,
          ...party,
          signerName: input.signerName,
          signerTitle: input.signerTitle,
          signerEmail: signer.email,
          signerUserId: signer.userId,
          document,
          ipAddress: signer.ipAddress,
          userAgent: signer.userAgent,
          signedAt,
        },
      });

      await tx.organization.update({
        where: { id: organizationId },
        data: { baaAcceptedAt: signedAt, baaVersion: BAA_VERSION },
      });
    });

    await invalidateHipaaCache(organizationId);

    await this.audit.record({
      actorUserId: signer.userId,
      actorOrgId: organizationId,
      actorIp: signer.ipAddress,
      actorUserAgent: signer.userAgent,
      action: "BAA_ACCEPTED",
      resourceType: "ContractAgreement",
      resourceId: organizationId,
      metadata: {
        version: BAA_VERSION,
        companyLegalName: input.companyLegalName,
        signerTitle: input.signerTitle,
        acceptanceMethod: "signature",
      },
    });

    return this.getStatus(organizationId);
  }

  async getSignedDocument(organizationId: string) {
    const agreement = await prisma.contractAgreement.findFirst({
      where: {
        organizationId,
        kind: AgreementKind.BAA,
        termsVersion: BAA_VERSION,
      },
      select: { document: true },
      orderBy: { signedAt: "desc" },
    });

    if (!agreement?.document) {
      throw new NotFoundException("No executed agreement for this version");
    }

    return Buffer.from(agreement.document);
  }

  // Records, logs and campaigns. Members, the signed agreement and the billing
  // ledger stay: the first two are who the organization is, the third is a
  // financial record neither side may destroy on request.
  //
  // Children before parents. Cascades would cover most of this on their own,
  // but an explicit order cannot half-delete if a relation is later relaxed.
  private purgeOperations(organizationId: string) {
    const scope = { where: { organizationId } };

    return [
      prisma.notification.deleteMany(scope),

      prisma.customAnalyticDashboard.deleteMany(scope),
      prisma.customAnalytic.deleteMany(scope),
      prisma.savedReport.deleteMany(scope),

      prisma.taskTimeEntry.deleteMany(scope),
      prisma.task.deleteMany(scope),
      prisma.taskList.deleteMany(scope),
      prisma.taskStatus.deleteMany(scope),
      prisma.taskLabel.deleteMany(scope),
      prisma.taskProject.deleteMany(scope),

      prisma.blastRecipient.deleteMany(scope),
      prisma.formSubmission.deleteMany(scope),
      prisma.blast.deleteMany(scope),
      prisma.form.deleteMany(scope),
      prisma.landingPage.deleteMany(scope),
      prisma.emailSubscriber.deleteMany(scope),
      prisma.recipientGroup.deleteMany(scope),
      prisma.senderIdentity.deleteMany(scope),
      prisma.campaign.deleteMany(scope),

      prisma.booking.deleteMany(scope),
      prisma.bookingPage.deleteMany(scope),

      prisma.mileage.deleteMany(scope),
      prisma.expense.deleteMany(scope),
      prisma.marketing.deleteMany(scope),

      prisma.emailOpenEvent.deleteMany(scope),
      prisma.history.deleteMany(scope),
      prisma.boardRelation.deleteMany(scope),
      prisma.fieldValue.deleteMany(scope),
      prisma.fieldOption.deleteMany(scope),
      prisma.activity.deleteMany(scope),
      prisma.boardCounty.deleteMany(scope),
      prisma.board.deleteMany(scope),
      prisma.field.deleteMany(scope),
      prisma.emailIngestAddress.deleteMany(scope),
      prisma.module.deleteMany(scope),

      prisma.orgIntegration.deleteMany(scope),
    ];
  }

  // Irreversible, owner only, and deliberately not on a timer: under a BAA the
  // covered entity decides when its PHI is destroyed, and its own retention
  // rules may require years.
  async purgeOrganizationData(
    organizationId: string,
    input: PurgeOrganizationDataInput,
    actor: SignerContext
  ) {
    const organization = await this.organization(organizationId);

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    if (input.confirmation !== organization.name) {
      throw new BadRequestException(
        "Type the organization name exactly as it appears to confirm."
      );
    }

    // Recorded before the delete, so an interrupted purge still leaves the
    // intent and the actor on the record.
    await this.audit.record({
      actorUserId: actor.userId,
      actorOrgId: organizationId,
      actorIp: actor.ipAddress,
      actorUserAgent: actor.userAgent,
      action: "organization.data.purge",
      resourceType: "organization",
      resourceId: organizationId,
    });

    const results = await prisma.$transaction(
      this.purgeOperations(organizationId)
    );

    return {
      deleted: results.reduce((total, result) => total + result.count, 0),
    };
  }
}
