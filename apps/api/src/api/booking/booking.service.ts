import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingLocation,
  CalendarProvider,
  LocationType,
  Prisma,
} from "@prisma/client";
import {
  NOTIFICATION_ENTITY,
  NOTIFICATION_TYPE,
} from "@dashboard/shared";
import { randomBytes } from "crypto";
import type { z } from "zod";
import { appConfig } from "../../config/app-config";
import { sendEmail } from "../../lib/aws/ses";
import { prisma } from "../../lib/prisma/prisma";
import { BookingCanceledEmail } from "../../react-email/booking-canceled-email";
import { BookingConfirmationEmail } from "../../react-email/booking-confirmation-email";
import { GoogleCalendarService } from "../calendar/google-calendar.service";
import { OutlookCalendarService } from "../calendar/outlook-calendar.service";
import { NotificationService } from "../notification/notification.service";
import { UpdateBookingPageSchema } from "./dto/booking.dto";
import { CreateBookingDto } from "./dto/booking.schema";
import {
  computeAvailableSlots,
  overlaps,
  zonedWallClockToUtc,
} from "./slot-calculator";

type UpdateBookingPageData = z.infer<typeof UpdateBookingPageSchema>;

const DEFAULT_TIMEZONE = "UTC";

// Only a page offering BOTH lets the invitee decide; anything else fixes the
// mode, and a request asking for the other one is rejected rather than coerced.
function resolveLocation(
  offered: LocationType,
  requested: BookingLocation | undefined
): BookingLocation {
  if (offered === "BOTH") return requested ?? "VIDEO";
  if (requested && requested !== offered) {
    throw new BadRequestException(
      "This booking page does not offer that meeting type"
    );
  }
  return offered;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly outlookCalendarService: OutlookCalendarService,
    private readonly notificationService: NotificationService
  ) {}

  // ─── Owner-facing (authenticated) ──────────────────────────────────

  async getOrCreateOwnPage(userId: string, organizationId: string) {
    const [page, google, outlook] = await Promise.all([
      this.getOrCreatePage(userId, organizationId),
      this.googleCalendarService.getConnectionStatus(userId),
      this.outlookCalendarService.getConnectionStatus(userId),
    ]);
    return {
      ...page,
      publicUrl: this.buildPublicUrl(page.slug),
      // Per provider rather than one flag: the settings page only offers the
      // Meet-or-Teams choice when both are connected.
      calendars: { google: google.connected, outlook: outlook.connected },
    };
  }

  async updateOwnPage(
    userId: string,
    organizationId: string,
    data: UpdateBookingPageData
  ) {
    const page = await this.getOrCreatePage(userId, organizationId);
    const updated = await prisma.bookingPage.update({
      where: { id: page.id },
      data,
    });
    return { ...updated, publicUrl: this.buildPublicUrl(updated.slug) };
  }

  async getOwnAvailability(userId: string, organizationId: string) {
    const page = await this.getOrCreatePage(userId, organizationId);
    return prisma.availabilityRule.findMany({
      where: { bookingPageId: page.id },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });
  }

  async replaceOwnAvailability(
    userId: string,
    organizationId: string,
    rules: { dayOfWeek: number; startMinute: number; endMinute: number }[]
  ) {
    const page = await this.getOrCreatePage(userId, organizationId);

    for (const rule of rules) {
      if (rule.startMinute >= rule.endMinute) {
        throw new BadRequestException(
          "Availability start time must be before end time"
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({
        where: { bookingPageId: page.id },
      });
      if (rules.length === 0) return [];
      await tx.availabilityRule.createMany({
        data: rules.map((r) => ({ ...r, bookingPageId: page.id })),
      });
      return tx.availabilityRule.findMany({
        where: { bookingPageId: page.id },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
      });
    });
  }

  async listOwnBookings(
    userId: string,
    organizationId: string,
    page: number,
    limit: number
  ) {
    const where: Prisma.BookingWhereInput = { userId, organizationId };
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { startTime: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      data,
      total,
      nextPage: page * limit < total ? page + 1 : null,
    };
  }

  async cancelOwnBooking(
    userId: string,
    organizationId: string,
    bookingId: string
  ) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId, organizationId },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    if (booking.externalEventId && booking.calendarProvider) {
      try {
        if (booking.calendarProvider === "google") {
          await this.googleCalendarService.deleteEvent(
            userId,
            booking.externalEventId
          );
        } else if (booking.calendarProvider === "outlook") {
          await this.outlookCalendarService.deleteEvent(
            userId,
            booking.externalEventId
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete calendar event for booking ${bookingId}: ${error.message}`
        );
      }
    }

    const cancelled = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    await this.sendCancellationEmails(userId, organizationId, cancelled);

    // Passing the canceller as actor means the host is not told about their
    // own cancellation, and an invitee-initiated one would notify them.
    const page = await prisma.bookingPage.findFirst({
      where: { userId, organizationId },
      select: { userId: true, organizationId: true, timezone: true },
    });
    if (page) {
      await this.notifyHost(page, {
        type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
        title: "Booking cancelled",
        body: `${cancelled.inviteeName} cancelled ${this.formatFor(page.timezone, cancelled.startTime)}.`,
        bookingId: cancelled.id,
        actorUserId: userId,
      });
    }

    return cancelled;
  }

  private async sendCancellationEmails(
    userId: string,
    organizationId: string,
    booking: {
      inviteeName: string;
      inviteeEmail: string;
      startTime: Date;
    }
  ) {
    try {
      const [host, page] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { name: true, email: true },
        }),
        prisma.bookingPage.findFirst({
          where: { userId, organizationId },
          select: { title: true, timezone: true, locationLabel: true },
        }),
      ]);

      const formattedTime = booking.startTime.toLocaleString("en-US", {
        timeZone: page?.timezone ?? DEFAULT_TIMEZONE,
        dateStyle: "full",
        timeStyle: "short",
      });

      const props = {
        referralName: booking.inviteeName,
        facility: page?.locationLabel ?? page?.title ?? "—",
        originalDateTime: formattedTime,
        canceledBy: host.name,
        bookingUrl: `${appConfig.WEBSITE_URL}/${organizationId}/calendar`,
      };

      await sendEmail({
        to: booking.inviteeEmail,
        subject: `Canceled: booking on ${formattedTime}`,
        html: BookingCanceledEmail({
          ...props,
          recipientName: booking.inviteeName,
        }),
        from: appConfig.APP_EMAIL,
      });

      await sendEmail({
        to: host.email,
        subject: `Canceled: booking with ${booking.inviteeName}`,
        html: BookingCanceledEmail({ ...props, recipientName: host.name }),
        from: appConfig.APP_EMAIL,
      });
    } catch (error) {
      this.logger.warn(`Failed to send cancellation emails: ${error.message}`);
    }
  }

  private async getOrCreatePage(userId: string, organizationId: string) {
    const existing = await prisma.bookingPage.findFirst({
      where: { userId, organizationId },
    });
    if (existing) return existing;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    return prisma.bookingPage.create({
      data: {
        userId,
        organizationId,
        slug: randomBytes(6).toString("hex"),
        title: `Meeting with ${user.name}`,
        timezone: DEFAULT_TIMEZONE,
      },
    });
  }

  private buildPublicUrl(slug: string): string {
    return `${appConfig.WEBSITE_URL}/book/${slug}`;
  }

  // ─── Public (unauthenticated) ───────────────────────────────────────

  async getPublicPage(slug: string) {
    const page = await prisma.bookingPage.findFirst({
      where: { slug, isActive: true },
      include: { user: { select: { name: true } } },
    });
    if (!page) throw new NotFoundException("Booking page not found");

    const [organization, calendarConnected] = await Promise.all([
      prisma.organization.findFirst({
        where: { id: page.organizationId },
        select: { name: true, logo: true },
      }),
      this.hasCalendarConnection(page.userId),
    ]);

    return {
      // Without a connected calendar the host cannot be told about a booking,
      // so the page renders but takes nothing.
      acceptingBookings: calendarConnected,
      title: page.title,
      description: page.description,
      durationMinutes: page.durationMinutes,
      locationType: page.locationType,
      locationLabel: page.locationLabel,
      timezone: page.timezone,
      hostName: page.user.name,
      organizationName: organization?.name ?? null,
      organizationLogo: organization?.logo ?? null,
    };
  }

  async getPublicSlots(slug: string, date: string) {
    const page = await this.findActivePageOrThrow(slug);

    if (!(await this.hasCalendarConnection(page.userId))) return [];

    const [year, month, day] = date.split("-").map(Number);
    const dayStart = zonedWallClockToUtc(year, month, day, 0, 0, page.timezone);
    const dayEnd = zonedWallClockToUtc(
      year,
      month,
      day + 1,
      0,
      0,
      page.timezone
    );

    const [calendarBusy, existingBookings] = await Promise.all([
      this.getCalendarBusyIntervals(page.userId, dayStart, dayEnd),
      prisma.booking.findMany({
        where: {
          bookingPageId: page.id,
          status: "CONFIRMED",
          startTime: { gte: dayStart, lt: dayEnd },
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const bookingBusy = existingBookings.map((b) => ({
      start: b.startTime,
      end: b.endTime,
    }));

    const slots = computeAvailableSlots({
      date,
      timezone: page.timezone,
      durationMinutes: page.durationMinutes,
      bufferBeforeMinutes: page.bufferBeforeMinutes,
      bufferAfterMinutes: page.bufferAfterMinutes,
      minNoticeHours: page.minNoticeHours,
      availability: page.availability,
      busy: [...calendarBusy, ...bookingBusy],
    });

    return slots.map((s) => s.toISOString());
  }

  async createPublicBooking(slug: string, dto: CreateBookingDto) {
    const page = await this.findActivePageOrThrow(slug);

    // Re-checked here and not only in the slot list: this endpoint is reachable
    // directly, and a booking the host never sees is worse than no booking.
    if (!(await this.hasCalendarConnection(page.userId))) {
      throw new BadRequestException(
        "This booking page is not accepting bookings right now"
      );
    }

    if (dto.boardId) {
      const board = await prisma.board.findFirst({
        where: {
          id: dto.boardId,
          organizationId: page.organizationId,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (!board) throw new BadRequestException("Invalid board reference");
    }

    const startTime = new Date(dto.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException("Invalid startTime");
    }
    const endTime = new Date(
      startTime.getTime() + page.durationMinutes * 60 * 1000
    );
    const bufferedStart = new Date(
      startTime.getTime() - page.bufferBeforeMinutes * 60 * 1000
    );
    const bufferedEnd = new Date(
      endTime.getTime() + page.bufferAfterMinutes * 60 * 1000
    );

    // The invitee's slot list may be stale (fetched moments ago, or bypassed
    // entirely by posting directly to this endpoint) — re-fetch calendar busy
    // time right before writing, with the same buffers the slot list applied.
    const calendarBusy = await this.getCalendarBusyIntervals(
      page.userId,
      bufferedStart,
      bufferedEnd
    );
    const calendarConflict = calendarBusy.some((busy) =>
      overlaps(bufferedStart, bufferedEnd, busy.start, busy.end)
    );
    if (calendarConflict) {
      throw new ConflictException(
        "This time slot was just booked — please choose another."
      );
    }

    let booking;
    try {
      booking = await prisma.$transaction(async (tx) => {
        const overlapping = await tx.booking.findFirst({
          where: {
            bookingPageId: page.id,
            status: "CONFIRMED",
            startTime: { lt: bufferedEnd },
            endTime: { gt: bufferedStart },
          },
        });
        if (overlapping) {
          throw new ConflictException(
            "This time slot was just booked — please choose another."
          );
        }

        return tx.booking.create({
          data: {
            bookingPageId: page.id,
            organizationId: page.organizationId,
            userId: page.userId,
            boardId: dto.boardId,
            inviteeName: dto.inviteeName,
            inviteeEmail: dto.inviteeEmail,
            inviteeNotes: dto.inviteeNotes,
            locationType: resolveLocation(page.locationType, dto.locationType),
            startTime,
            endTime,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "This time slot was just booked — please choose another."
        );
      }
      throw error;
    }

    const meetingUrl = await this.syncBookingToCalendar(page, booking);
    await this.sendBookingEmails(page, booking, meetingUrl);
    await this.notifyHost(page, {
      type: NOTIFICATION_TYPE.BOOKING_CREATED,
      title: "New booking scheduled",
      body: `${booking.inviteeName} booked a ${page.durationMinutes} min meeting for ${this.formatFor(page.timezone, booking.startTime)}.`,
      bookingId: booking.id,
    });

    return {
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      meetingUrl,
    };
  }

  private async findActivePageOrThrow(slug: string) {
    const page = await prisma.bookingPage.findFirst({
      where: { slug, isActive: true },
      include: { availability: true },
    });
    if (!page) throw new NotFoundException("Booking page not found");
    return page;
  }

  private formatFor(timezone: string, at: Date) {
    return at.toLocaleString("en-US", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // The host reads notifications as a member, so their member row is the
  // recipient. An invitee has no account and is never the actor.
  private async notifyHost(
    page: { userId: string; organizationId: string },
    event: {
      type: string;
      title: string;
      body: string;
      bookingId: string;
      actorUserId?: string;
    }
  ) {
    const member = await prisma.member.findFirst({
      where: { userId: page.userId, organizationId: page.organizationId },
      select: { id: true },
    });
    if (!member) return;

    await this.notificationService.notify({
      organizationId: page.organizationId,
      recipientMemberIds: [member.id],
      type: event.type,
      title: event.title,
      body: event.body,
      link: `/${page.organizationId}/settings/booking`,
      entityType: NOTIFICATION_ENTITY.BOOKING,
      entityId: event.bookingId,
      actorUserId: event.actorUserId ?? null,
    });
  }

  // A booking is only real once it lands on the host's calendar, so every path
  // that offers or writes one checks this first.
  private async hasCalendarConnection(userId: string): Promise<boolean> {
    const [google, outlook] = await Promise.all([
      this.googleCalendarService.getConnectionStatus(userId),
      this.outlookCalendarService.getConnectionStatus(userId),
    ]);
    return google.connected || outlook.connected;
  }

  // Fetches Google + Outlook events in range, drops cancelled events, and
  // discards everything except {start, end} before it reaches any caller.
  private async getCalendarBusyIntervals(
    userId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<{ start: Date; end: Date }[]> {
    const [googleEvents, outlookEvents] = await Promise.all([
      this.googleCalendarService.getEvents(
        userId,
        timeMin.toISOString(),
        timeMax.toISOString()
      ),
      this.outlookCalendarService.getEvents(
        userId,
        timeMin.toISOString(),
        timeMax.toISOString()
      ),
    ]);

    return [...googleEvents, ...outlookEvents]
      .filter(
        (event) => event.status !== "cancelled" && event.start && event.end
      )
      .map((event) => ({
        start: new Date(event.start as string),
        end: new Date(event.end as string),
      }));
  }

  // Returns the join URL when the provider minted one, so the confirmation
  // emails can carry it.
  private async syncBookingToCalendar(
    page: {
      userId: string;
      title: string;
      locationLabel: string | null;
      preferredProvider: CalendarProvider | null;
    },
    booking: {
      id: string;
      startTime: Date;
      endTime: Date;
      inviteeName: string;
      inviteeEmail: string;
      locationType: BookingLocation;
    }
  ): Promise<string | null> {
    try {
      const [google, outlook] = await Promise.all([
        this.googleCalendarService.getConnectionStatus(page.userId),
        this.outlookCalendarService.getConnectionStatus(page.userId),
      ]);

      const eventData = {
        title: `${page.title} with ${booking.inviteeName}`,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        location: page.locationLabel ?? undefined,
        attendees: [booking.inviteeEmail],
        // An in-person meeting has a room, not a join link.
        createConference: booking.locationType === "VIDEO",
      };

      let created: { id?: string | null; meetingUrl?: string | null } | null =
        null;
      let provider: "google" | "outlook" | null = null;

      // The host's preference decides when both are connected, because that
      // choice is also Meet vs Teams for the invitee.
      const useOutlook =
        page.preferredProvider === "OUTLOOK"
          ? outlook.connected
          : !google.connected && outlook.connected;

      if (useOutlook) {
        created = await this.outlookCalendarService.createEvent(
          page.userId,
          eventData
        );
        provider = "outlook";
      } else if (google.connected) {
        created = await this.googleCalendarService.createEvent(
          page.userId,
          eventData
        );
        provider = "google";
      }

      if (created?.id && provider) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            externalEventId: created.id,
            calendarProvider: provider,
            meetingUrl: created.meetingUrl ?? null,
          },
        });
      }

      return created?.meetingUrl ?? null;
    } catch (error) {
      this.logger.warn(
        `Calendar sync failed for booking ${booking.id}: ${error.message}`
      );
      await prisma.booking.update({
        where: { id: booking.id },
        data: { calendarSyncFailed: true },
      });
      return null;
    }
  }

  private async sendBookingEmails(
    page: {
      userId: string;
      title: string;
      timezone: string;
      locationLabel: string | null;
    },
    booking: {
      inviteeName: string;
      inviteeEmail: string;
      startTime: Date;
    },
    meetingUrl: string | null
  ) {
    try {
      const host = await prisma.user.findUniqueOrThrow({
        where: { id: page.userId },
        select: { name: true, email: true },
      });

      const formattedTime = booking.startTime.toLocaleString("en-US", {
        timeZone: page.timezone,
        dateStyle: "full",
        timeStyle: "short",
      });

      await sendEmail({
        to: booking.inviteeEmail,
        subject: `Confirmed: ${page.title}`,
        html: BookingConfirmationEmail({
          recipientName: booking.inviteeName,
          title: page.title,
          startTime: formattedTime,
          hostName: host.name,
          locationLabel: page.locationLabel,
          meetingUrl,
        }),
        from: appConfig.APP_EMAIL,
      });

      await sendEmail({
        to: host.email,
        subject: `New booking: ${booking.inviteeName}`,
        html: BookingConfirmationEmail({
          recipientName: host.name,
          title: page.title,
          startTime: formattedTime,
          hostName: host.name,
          locationLabel: page.locationLabel,
          meetingUrl,
        }),
        from: appConfig.APP_EMAIL,
      });
    } catch (error) {
      this.logger.warn(`Failed to send booking emails: ${error.message}`);
    }
  }
}
