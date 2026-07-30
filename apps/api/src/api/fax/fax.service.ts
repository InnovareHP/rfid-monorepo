import { Injectable } from "@nestjs/common";
import { AuditService } from "../../lib/audit/audit.service";
import {
  EldonFaxError,
  getFax,
  listFaxes,
  sendFax,
  type FaxAttachment,
} from "../../lib/eldonfax/eldonfax";
import { prisma } from "../../lib/prisma/prisma";

export const FAX_PROVIDER = "eldonfax";

interface Actor {
  userId: string;
  orgId: string;
  role: string;
}

@Injectable()
export class FaxService {
  constructor(private readonly audit: AuditService) {}

  // apiKey column is encrypted at rest; the Prisma extension decrypts on read
  private async resolveApiKey(orgId: string): Promise<string | undefined> {
    const integration = await prisma.orgIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: FAX_PROVIDER,
        },
      },
      select: { apiKey: true },
    });
    return integration?.apiKey;
  }

  async connect(apiKey: string, actor: Actor) {
    // reject keys that can't authenticate before storing them
    try {
      await listFaxes(1, 1, apiKey);
    } catch (error) {
      if (error instanceof EldonFaxError && error.status === 401) {
        throw new EldonFaxError("Invalid Eldon Fax API key", 400, error.code);
      }
      throw error;
    }

    await prisma.orgIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId: actor.orgId,
          provider: FAX_PROVIDER,
        },
      },
      create: {
        organizationId: actor.orgId,
        provider: FAX_PROVIDER,
        apiKey,
      },
      update: { apiKey },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      actorOrgId: actor.orgId,
      actorRole: actor.role,
      action: "integration.connect",
      resourceType: "OrgIntegration",
      resourceId: FAX_PROVIDER,
    });

    return this.status(actor.orgId);
  }

  async disconnect(actor: Actor) {
    await prisma.orgIntegration.deleteMany({
      where: { organizationId: actor.orgId, provider: FAX_PROVIDER },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      actorOrgId: actor.orgId,
      actorRole: actor.role,
      action: "integration.disconnect",
      resourceType: "OrgIntegration",
      resourceId: FAX_PROVIDER,
    });

    return { connected: false };
  }

  async status(orgId: string) {
    const apiKey = await this.resolveApiKey(orgId);
    return {
      connected: Boolean(apiKey),
      apiKeyLast4: apiKey ? apiKey.slice(-4) : null,
    };
  }

  async sendFax(to: string | string[], file: FaxAttachment, actor: Actor) {
    const apiKey = await this.resolveApiKey(actor.orgId);
    const fax = await sendFax(to, file, { apiKey });

    // Fax = PHI disclosure — record it for the §164.528 accounting trail
    await this.audit.record({
      actorUserId: actor.userId,
      actorOrgId: actor.orgId,
      actorRole: actor.role,
      action: "fax.send",
      resourceType: "Fax",
      resourceId: fax.id ?? null,
      metadata: {
        to: Array.isArray(to) ? to : [to],
        filename: file.filename,
        bytes: file.buffer.length,
      },
    });

    return fax;
  }

  async listFaxes(orgId: string, page: number, limit: number) {
    const apiKey = await this.resolveApiKey(orgId);
    return listFaxes(page, limit, apiKey);
  }

  async getFax(orgId: string, id: string) {
    const apiKey = await this.resolveApiKey(orgId);
    return getFax(id, apiKey);
  }
}
