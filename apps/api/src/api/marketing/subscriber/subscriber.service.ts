import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, SubscriberSource, SubscriberStatus } from "@prisma/client";
import { appConfig } from "../../../config/app-config";
import {
  emailIndex,
  normalizeEmail,
  signSubscribeToken,
  signUnsubscribeToken,
  verifySubscribeToken,
  verifyUnsubscribeToken,
} from "../../../lib/crypto/email-index";
import { prisma } from "../../../lib/prisma/prisma";
import { CreateSubscriberDto, ListSubscribersDto } from "./dto/subscriber.dto";

@Injectable()
export class SubscriberService {
  async list(organizationId: string, query: ListSubscribersDto) {
    const where: Prisma.EmailSubscriberWhereInput = {
      organizationId,
      ...(query.status && { status: query.status }),
    };

    const [rows, total] = await Promise.all([
      prisma.emailSubscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailSubscriber.count({ where }),
    ]);

    // Email and name are encrypted, so a search term cannot go into the query
    // and is matched here after the extension has decrypted the page.
    const term = query.search?.trim().toLowerCase();
    const matched = term
      ? rows.filter(
          (row) =>
            row.email.toLowerCase().includes(term) ||
            (row.name ?? "").toLowerCase().includes(term)
        )
      : rows;

    const start = (query.page - 1) * query.limit;

    return {
      total: term ? matched.length : total,
      page: query.page,
      limit: query.limit,
      subscribers: matched.slice(start, start + query.limit),
    };
  }

  // Subscribing is idempotent: a returning address flips back to SUBSCRIBED
  // rather than colliding on the org + hash key.
  async subscribe(
    organizationId: string,
    input: {
      email: string;
      name?: string;
      source: SubscriberSource;
      recordId?: string;
    }
  ) {
    const email = normalizeEmail(input.email);

    return prisma.emailSubscriber.upsert({
      where: {
        organizationId_emailHash: {
          organizationId,
          emailHash: emailIndex(email),
        },
      },
      create: {
        email,
        emailHash: emailIndex(email),
        name: input.name ?? null,
        source: input.source,
        status: SubscriberStatus.SUBSCRIBED,
        organizationId,
        recordId: input.recordId ?? null,
      },
      update: {
        status: SubscriberStatus.SUBSCRIBED,
        subscribedAt: new Date(),
        unsubscribedAt: null,
        ...(input.name && { name: input.name }),
        ...(input.recordId && { recordId: input.recordId }),
      },
    });
  }

  async create(organizationId: string, dto: CreateSubscriberDto) {
    return this.subscribe(organizationId, {
      email: dto.email,
      name: dto.name,
      source: SubscriberSource.MANUAL,
    });
  }

  async setStatus(
    id: string,
    organizationId: string,
    status: SubscriberStatus
  ) {
    const subscriber = await prisma.emailSubscriber.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!subscriber) throw new NotFoundException("Subscriber not found");

    return prisma.emailSubscriber.update({
      where: { id },
      data: {
        status,
        ...(status === SubscriberStatus.UNSUBSCRIBED
          ? { unsubscribedAt: new Date() }
          : { unsubscribedAt: null, subscribedAt: new Date() }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const subscriber = await prisma.emailSubscriber.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!subscriber) throw new NotFoundException("Subscriber not found");

    await prisma.emailSubscriber.delete({ where: { id } });

    return { message: "Subscriber deleted successfully" };
  }

  // Reading a subscription only needs the claim in the link. An address that
  // was never on the list is simply subscribed by default.
  async getByToken(token: string) {
    const claim = verifyUnsubscribeToken(token);
    if (!claim) throw new NotFoundException("Subscription not found");

    const [organization, subscriber] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: claim.organizationId },
        select: { name: true },
      }),
      prisma.emailSubscriber.findUnique({
        where: {
          organizationId_emailHash: {
            organizationId: claim.organizationId,
            emailHash: claim.emailHash,
          },
        },
      }),
    ]);

    if (!organization) throw new NotFoundException("Subscription not found");

    return {
      organizationName: organization.name,
      status: subscriber?.status ?? SubscriberStatus.SUBSCRIBED,
    };
  }

  // Opting out is what materializes the row, so a blast that merely mailed an
  // address never leaves anything behind on the subscriber list.
  async setStatusByToken(token: string, status: SubscriberStatus) {
    const claim = verifyUnsubscribeToken(token);
    if (!claim) throw new NotFoundException("Subscription not found");

    const organization = await prisma.organization.findUnique({
      where: { id: claim.organizationId },
      select: { name: true },
    });

    if (!organization) throw new NotFoundException("Subscription not found");

    const unsubscribing = status === SubscriberStatus.UNSUBSCRIBED;

    await prisma.emailSubscriber.upsert({
      where: {
        organizationId_emailHash: {
          organizationId: claim.organizationId,
          emailHash: claim.emailHash,
        },
      },
      create: {
        // The address itself is not in the link, so a row created here is
        // keyed by its hash until the person is matched by another path.
        email: "",
        emailHash: claim.emailHash,
        source: SubscriberSource.BLAST,
        status,
        organizationId: claim.organizationId,
        ...(unsubscribing && { unsubscribedAt: new Date() }),
      },
      update: {
        status,
        ...(unsubscribing
          ? { unsubscribedAt: new Date() }
          : { unsubscribedAt: null, subscribedAt: new Date() }),
      },
    });

    return { organizationName: organization.name, status };
  }

  // Addresses that have opted out, as a hash set the caller can test without
  // decrypting anything.
  async suppressedHashes(
    organizationId: string,
    emails: string[]
  ): Promise<Set<string>> {
    const hashes = [...new Set(emails.map(emailIndex))];
    if (hashes.length === 0) return new Set();

    const rows = await prisma.emailSubscriber.findMany({
      where: {
        organizationId,
        status: SubscriberStatus.UNSUBSCRIBED,
        emailHash: { in: hashes },
      },
      select: { emailHash: true },
    });

    return new Set(rows.map((row) => row.emailHash));
  }

  // A row created from an unsubscribe link knows only the hash, so one that
  // was later resubscribed has no address to mail and is skipped.
  async subscribedMembers(organizationId: string) {
    const rows = await prisma.emailSubscriber.findMany({
      where: { organizationId, status: SubscriberStatus.SUBSCRIBED },
      select: { id: true, email: true, name: true },
    });

    return rows.filter((row) => row.email);
  }

  // Org-wide signup link for the footer. Signed so the raw organization id
  // never rides in a URL that gets forwarded around.
  subscribeUrl(organizationId: string): string {
    return `${appConfig.WEBSITE_URL}/s/${signSubscribeToken(organizationId)}`;
  }

  async subscribeByToken(
    token: string,
    input: { email: string; name?: string }
  ) {
    const organizationId = verifySubscribeToken(token);
    if (!organizationId) throw new NotFoundException("Link not found");

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) throw new NotFoundException("Link not found");

    await this.subscribe(organizationId, {
      email: input.email,
      name: input.name,
      source: SubscriberSource.FORM,
    });

    return { organizationName: organization.name };
  }

  async getSubscribeTarget(token: string) {
    const organizationId = verifySubscribeToken(token);
    if (!organizationId) throw new NotFoundException("Link not found");

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) throw new NotFoundException("Link not found");

    return { organizationName: organization.name };
  }

  unsubscribeUrl(organizationId: string, email: string): string {
    const token = signUnsubscribeToken(organizationId, email);

    return `${appConfig.WEBSITE_URL}/u/${token}`;
  }

  // Promoting a subscriber needs a CRM record to point at, so the caller
  // supplies one rather than this guessing a module or its fields.
  async linkToRecord(id: string, organizationId: string, recordId: string) {
    const [subscriber, record] = await Promise.all([
      prisma.emailSubscriber.findFirst({
        where: { id, organizationId },
        select: { id: true },
      }),
      prisma.board.findFirst({
        where: { id: recordId, organizationId, isDeleted: false },
        select: { id: true },
      }),
    ]);

    if (!subscriber) throw new NotFoundException("Subscriber not found");
    if (!record)
      throw new BadRequestException("Record not found in this organization");

    return prisma.emailSubscriber.update({
      where: { id },
      data: { recordId },
    });
  }
}
