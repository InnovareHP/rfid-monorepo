import { Injectable, Logger } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { sendEmail } from "../../lib/aws/ses";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped } from "../../lib/prisma/tenant-context";
import { BookingUpcomingEmail } from "../../react-email/booking-upcoming-email";

// How far ahead of a meeting the reminder goes out.
const LEAD_HOURS = 24;

// A booking closer than this has already had its chance; reminding someone about
// a meeting starting in four minutes is noise, not help.
const FLOOR_MINUTES = 30;

// Bounds one sweep so a backlog cannot turn into one enormous mail run.
const BATCH = 100;

const formatInZone = (at: Date, timeZone: string) =>
  at.toLocaleString("en-US", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
    timeZoneName: "short",
  });

// Bookings belong to organizations, but the sweep runs on a timer with no
// request and no active organization, so it reads across tenants by design.
@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  async sweep(now = new Date()): Promise<number> {
    const horizon = new Date(now.getTime() + LEAD_HOURS * 60 * 60 * 1000);
    const floor = new Date(now.getTime() + FLOOR_MINUTES * 60 * 1000);

    const due = await runUnscoped(() =>
      prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          reminderSentAt: null,
          startTime: { gt: floor, lte: horizon },
        },
        include: { bookingPage: true },
        orderBy: { startTime: "asc" },
        take: BATCH,
      })
    );

    let sent = 0;

    for (const booking of due) {
      // Claimed before the send, not after: a mail failure must not leave the
      // row eligible forever and mail the invitee on every later sweep.
      const claimed = await runUnscoped(() =>
        prisma.booking.updateMany({
          where: { id: booking.id, reminderSentAt: null },
          data: { reminderSentAt: new Date() },
        })
      );
      if (claimed.count === 0) continue;

      try {
        await sendEmail({
          to: booking.inviteeEmail,
          subject: `Reminder: ${booking.bookingPage.title}`,
          html: BookingUpcomingEmail({
            recipientName: booking.inviteeName,
            title: booking.bookingPage.title,
            startTime: formatInZone(
              booking.startTime,
              booking.inviteeTimezone ?? booking.bookingPage.timezone
            ),
            locationLabel: booking.bookingPage.locationLabel,
            meetingUrl: booking.meetingUrl,
            manageUrl: `${appConfig.WEBSITE_URL}/booking/${booking.id}`,
          }),
          from: appConfig.APP_EMAIL,
        });
        sent += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to send reminder for booking ${booking.id}: ${error.message}`
        );
      }
    }

    return sent;
  }
}
