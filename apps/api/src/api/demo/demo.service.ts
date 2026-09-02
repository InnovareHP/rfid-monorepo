import type { DemoRequestStatus } from "@dashboard/shared";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import { BookingService } from "../booking/booking.service";
import { appConfig } from "../../config/app-config";
import { sendEmail } from "../../lib/aws/ses";
import { prisma } from "../../lib/prisma/prisma";
import { DemoRequestAlertEmail } from "../../react-email/demo-request-alert-email";
import { DemoRequestReceivedEmail } from "../../react-email/demo-request-received-email";
import type {
  CreateDemoRequestSchema,
  ListDemoRequestsQuerySchema,
  UpdateDemoRequestSchema,
} from "./dto/demo.dto";

type CreateDemoRequestInput = z.infer<typeof CreateDemoRequestSchema>;
type ListFilters = z.infer<typeof ListDemoRequestsQuerySchema>;
type UpdateInput = z.infer<typeof UpdateDemoRequestSchema>;

// Demo rows belong to the product, not to a tenant. Both controllers carry
// @CrossTenant(), which is what lets the org-scoped BookingPage reads below run
// with no active organization.
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(private readonly bookingService: BookingService) {}

  // The host is pinned at capture so the slot list and the booking always read
  // the same calendar. The rotation itself only advances once a meeting is
  // actually booked — stamping here would let an abandoned form consume a turn.
  private async pickHost() {
    return prisma.bookingPage.findFirst({
      where: { demoEnabled: true, isActive: true },
      // Nulls first: a host that has never taken a demo goes before one that has.
      orderBy: [{ demoLastAssignedAt: { sort: "asc", nulls: "first" } }],
      select: { id: true, userId: true, slug: true },
    });
  }

  private async hostForRequest(requestId: string) {
    const request = await prisma.demoRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, assignedUserId: true },
    });
    if (!request) throw new NotFoundException("Demo request not found");

    if (!request.assignedUserId) {
      throw new BadRequestException("No demo host is available right now");
    }

    const page = await prisma.bookingPage.findFirst({
      where: { userId: request.assignedUserId, demoEnabled: true },
      select: { id: true, slug: true },
    });
    if (!page) throw new NotFoundException("Demo host is no longer available");

    return { request, pageId: page.id, slug: page.slug };
  }

  // A bot filling the honeypot gets the same shape as a person, so it cannot
  // tell it was refused. Nothing is written.
  async createRequest(dto: CreateDemoRequestInput) {
    if (dto.website) return { id: null, acceptingBookings: false };

    const host = await this.pickHost();

    const request = await prisma.demoRequest.create({
      data: {
        name: dto.name,
        email: dto.email,
        company: dto.company,
        phone: dto.phone,
        teamSize: dto.teamSize,
        notes: dto.notes,
        source: dto.source ?? "landing",
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        assignedUserId: host?.userId ?? null,
      },
      select: { id: true },
    });

    if (!host) {
      await this.acknowledgeUnschedulable(
        dto,
        "No host is currently in the demo rotation, so this request could not be scheduled online."
      );
      return { id: request.id, acceptingBookings: false };
    }

    // The booking page decides whether it can actually take a booking, which
    // depends on a connected calendar, not on the row existing.
    const page = await this.bookingService.getPublicPage(host.slug);

    // Same silence otherwise: the prospect is told to expect an email, so one
    // has to actually go out.
    if (!page.acceptingBookings) {
      await this.acknowledgeUnschedulable(
        dto,
        "The assigned demo host has no connected calendar, so this request could not be scheduled online."
      );
    }

    return {
      id: request.id,
      acceptingBookings: page.acceptingBookings,
      hostName: page.hostName,
      timezone: page.timezone,
      durationMinutes: page.durationMinutes,
    };
  }

  // Non-fatal: the request is already saved, so a mail failure must not turn a
  // captured lead into an error page.
  private async acknowledgeUnschedulable(
    dto: CreateDemoRequestInput,
    reason: string
  ) {
    try {
      await sendEmail({
        to: dto.email,
        subject: "We have your demo request",
        html: DemoRequestReceivedEmail({ recipientName: dto.name }),
        from: appConfig.APP_EMAIL,
      });
    } catch (error) {
      this.logger.warn(`Failed to send demo acknowledgement: ${error.message}`);
    }

    // Nobody is watching an empty rotation, so the admins are told directly
    // rather than left to notice a row in the table.
    try {
      const admins = await prisma.user.findMany({
        where: { role: "super_admin" },
        select: { email: true },
      });

      const html = DemoRequestAlertEmail({
        name: dto.name,
        email: dto.email,
        company: dto.company,
        teamSize: dto.teamSize,
        notes: dto.notes,
        reason,
      });

      await Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Demo request needs scheduling: ${dto.name}`,
            html,
            from: appConfig.APP_EMAIL,
          })
        )
      );
    } catch (error) {
      this.logger.warn(
        `Failed to alert admins of a demo request: ${error.message}`
      );
    }
  }

  async getSlots(requestId: string, date: string) {
    const { slug } = await this.hostForRequest(requestId);
    return this.bookingService.getPublicSlots(slug, date);
  }

  async getAvailableDays(requestId: string, month: string) {
    const { slug } = await this.hostForRequest(requestId);
    return this.bookingService.getPublicAvailableDays(slug, month);
  }

  async book(requestId: string, startTime: string, inviteeTimezone?: string) {
    const { request, pageId, slug } = await this.hostForRequest(requestId);

    if (request.status !== "NEW") {
      throw new BadRequestException("This demo request is already scheduled");
    }

    const full = await prisma.demoRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { name: true, email: true, company: true, notes: true },
    });

    // Delegated so calendar sync, the invitee email and the host notification
    // all come from the one path that already does them.
    const booking = await this.bookingService.createPublicBooking(slug, {
      startTime,
      inviteeName: full.name,
      inviteeEmail: full.email,
      inviteeNotes: [full.company && `Company: ${full.company}`, full.notes]
        .filter(Boolean)
        .join("\n"),
      inviteeTimezone,
    });

    // The rotation advances here, on a real booking, not at capture, so an
    // abandoned form cannot consume a host's turn.
    await prisma.bookingPage.update({
      where: { id: pageId },
      data: { demoLastAssignedAt: new Date() },
    });

    await prisma.demoRequest.update({
      where: { id: requestId },
      data: {
        status: "SCHEDULED",
        bookingId: booking.id,
        scheduledAt: booking.startTime,
      },
    });

    return {
      startTime: booking.startTime,
      endTime: booking.endTime,
      meetingUrl: booking.meetingUrl,
    };
  }

  // ─── Superadmin ─────────────────────────────────────────────────────

  async listRequests(filters: ListFilters) {
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                name: {
                  contains: filters.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: filters.search,
                  mode: "insensitive" as const,
                },
              },
              {
                company: {
                  contains: filters.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.demoRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.demoRequest.count({ where }),
    ]);

    const hostNames = await this.hostNamesFor(
      data.map((row) => row.assignedUserId)
    );

    return {
      data: data.map((row) => ({
        ...row,
        assignedHostName: row.assignedUserId
          ? (hostNames.get(row.assignedUserId) ?? null)
          : null,
      })),
      total,
    };
  }

  private async hostNamesFor(userIds: (string | null)[]) {
    const ids = [...new Set(userIds.filter((id): id is string => !!id))];
    if (!ids.length) return new Map<string, string>();

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    return new Map(users.map((user) => [user.id, user.name]));
  }

  async updateRequest(
    requestId: string,
    dto: UpdateInput,
    admin: { id: string; name: string }
  ) {
    const existing = await prisma.demoRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, name: true },
    });
    if (!existing) throw new NotFoundException("Demo request not found");

    const updated = await prisma.demoRequest.update({
      where: { id: requestId },
      data: {
        ...(dto.status ? { status: dto.status as DemoRequestStatus } : {}),
        ...(dto.outcomeNotes !== undefined
          ? { outcomeNotes: dto.outcomeNotes }
          : {}),
      },
    });

    await this.logAdminAction(admin, "UPDATE_DEMO_REQUEST", {
      targetName: existing.name,
      details: dto.status
        ? `Demo request ${existing.status} -> ${dto.status}`
        : "Updated demo outcome notes",
    });

    return updated;
  }

  // Every super admin with a booking page is a candidate host; demoEnabled is
  // what puts them in the rotation.
  async listHosts() {
    const admins = await prisma.user.findMany({
      where: { role: "super_admin" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const pages = await prisma.bookingPage.findMany({
      where: { userId: { in: admins.map((admin) => admin.id) } },
      select: {
        userId: true,
        slug: true,
        isActive: true,
        demoEnabled: true,
        demoLastAssignedAt: true,
      },
    });

    const pageByUser = new Map(pages.map((page) => [page.userId, page]));

    return admins.map((admin) => {
      const page = pageByUser.get(admin.id);
      return {
        userId: admin.id,
        name: admin.name,
        email: admin.email,
        // No booking page means no availability and no calendar, so they cannot
        // host until they set one up in the dashboard.
        hasBookingPage: !!page,
        slug: page?.slug ?? null,
        isActive: page?.isActive ?? false,
        demoEnabled: page?.demoEnabled ?? false,
        demoLastAssignedAt: page?.demoLastAssignedAt ?? null,
      };
    });
  }

  async setHost(
    userId: string,
    demoEnabled: boolean,
    admin: { id: string; name: string }
  ) {
    const page = await prisma.bookingPage.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!page) {
      throw new BadRequestException(
        "This user has no booking page yet. They need to set one up before hosting demos."
      );
    }

    await prisma.bookingPage.update({
      where: { id: page.id },
      data: { demoEnabled },
    });

    await this.logAdminAction(admin, "SET_DEMO_HOST", {
      targetUserId: userId,
      details: demoEnabled
        ? "Added to the demo host rotation"
        : "Removed from the demo host rotation",
    });

    return { userId, demoEnabled };
  }

  private async logAdminAction(
    admin: { id: string; name: string },
    action: "UPDATE_DEMO_REQUEST" | "SET_DEMO_HOST",
    entry: { targetUserId?: string; targetName?: string; details: string }
  ) {
    await prisma.adminActivityLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name,
        action,
        targetUserId: entry.targetUserId,
        targetName: entry.targetName,
        details: entry.details,
      },
    });
  }
}
