import type { ActivityType, Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { TOUCHPOINT_ACTIVITIES } from "../../../src/api/liaison/liaison-activity.service";
import {
  CALL_TITLES,
  CANCELLED_NOTES,
  CONTACT_ACTIVITY_TITLES,
  EMAIL_BODIES,
  EMAIL_SUBJECTS,
  FAX_TITLES,
  FOLLOW_UP_NOTES,
  FOLLOW_UP_TITLES,
  LOGGED_ACTIVITY_TYPES,
  MEETING_TITLES,
  NOTE_TITLES,
  OPEN_CLIENT_TYPES,
  TEXT_TITLES,
} from "./catalog/activities";
import type { DemoContact } from "./crm";
import type { DemoContext } from "./context";
import type { DemoFacility } from "./facilities";
import { between, daysAgo, pick, random } from "./random";

export type ActivityCounts = {
  mirrored: number;
  logged: number;
  followUps: number;
  overdue: number;
  cancelled: number;
  opens: number;
};

type ActivityRow = Prisma.ActivityCreateManyInput & { id: string };

// Days forward from today, for a follow-up that is still due.
const daysAhead = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const titleFor = (type: ActivityType): string => {
  if (type === "CALL") return pick(CALL_TITLES);
  if (type === "MEETING") return pick(MEETING_TITLES);
  if (type === "NOTE") return pick(NOTE_TITLES);
  if (type === "TEXT") return pick(TEXT_TITLES);
  if (type === "FAX") return pick(FAX_TITLES);
  return pick(EMAIL_SUBJECTS);
};

const faxNumber = () => `(217) ${between(200, 899)}-${between(1000, 9999)}`;

// The app writes the tracking pixel id and the message id on every outbound
// email, so a seeded one carries them too or the email column reads as never
// sent rather than as sent and unopened.
const emailFields = (
  recipientEmail: string,
  sentAt: Date,
  senderEmail: string
) => {
  const subject = pick(EMAIL_SUBJECTS);

  return {
    title: subject,
    description: pick(EMAIL_BODIES),
    recipientEmail,
    emailSubject: subject,
    emailBody: pick(EMAIL_BODIES),
    emailSentAt: sentAt,
    senderEmail,
    trackingId: uuidv4(),
    messageId: `<${uuidv4()}@demo.local>`,
  };
};

export async function seedActivities(
  prisma: PrismaClient,
  ctx: DemoContext,
  facilities: DemoFacility[],
  contacts: DemoContact[]
): Promise<ActivityCounts> {
  const { organizationId, profile } = ctx;

  const rows: ActivityRow[] = [];
  const opens: Prisma.EmailOpenEventCreateManyInput[] = [];

  // 1. Every visit log gets the activity the app would have mirrored for it.
  // Without this the record timeline is empty for visits that plainly happened,
  // and the two views disagree about the same facility.
  const logs = await prisma.marketing.findMany({
    where: { organizationId, facilityRecordId: { not: null } },
    select: {
      id: true,
      facilityRecordId: true,
      touchpoints: true,
      talkedTo: true,
      notes: true,
      reasonForVisit: true,
      userId: true,
      createdAt: true,
    },
  });

  const alreadyMirrored = new Set(
    (
      await prisma.activity.findMany({
        where: { organizationId, marketingId: { not: null } },
        select: { marketingId: true },
      })
    ).map((row) => row.marketingId)
  );

  for (const log of logs) {
    if (alreadyMirrored.has(log.id)) continue;
    if (!log.facilityRecordId || !log.touchpoints.length) continue;
    // Marketing.userId goes null when a member leaves, and Activity.createdBy
    // cannot, so a log with no author has no activity the app could hold.
    if (!log.userId) continue;

    rows.push({
      id: uuidv4(),
      title: log.reasonForVisit
        ? `Marketing touchpoint: ${log.reasonForVisit}`
        : "Marketing touchpoint",
      description: `${log.touchpoints.join(", ")} - talked to ${log.talkedTo}${
        log.notes ? ` - ${log.notes}` : ""
      }`,
      activityType: TOUCHPOINT_ACTIVITIES[log.touchpoints[0]],
      status: "COMPLETED",
      completedAt: log.createdAt,
      recordId: log.facilityRecordId,
      marketingId: log.id,
      createdBy: log.userId,
      organizationId,
      createdAt: log.createdAt,
    });
  }

  const mirrored = rows.length;

  // 2. Activities that are not visits: calls, notes, faxes, tracked emails.
  const contactByFacility = (index: number) =>
    contacts[index % contacts.length];

  for (let index = 0; index < profile.activities; index += 1) {
    const onFacility = random() < 0.7 || !contacts.length;
    const facility = facilities[between(0, facilities.length - 1)];
    const contact = contactByFacility(index);
    const member = pick(ctx.assignable);
    const createdAt = daysAgo(between(1, profile.windowDays));
    const type = onFacility
      ? pick(LOGGED_ACTIVITY_TYPES)
      : pick(["CALL", "EMAIL", "NOTE"] as ActivityType[]);

    const base = {
      id: uuidv4(),
      activityType: type,
      status: "COMPLETED" as const,
      completedAt: createdAt,
      recordId: onFacility ? facility.id : contact.id,
      createdBy: member.userId,
      organizationId,
      createdAt,
    };

    if (type === "EMAIL") {
      const email = emailFields(
        contact?.email ?? "admissions@demo.example",
        createdAt,
        `liaison@${organizationId.slice(0, 8)}.example`
      );

      // Roughly two in three land as opened, which is what makes the open-rate
      // column read as a rate rather than as all or nothing.
      const openCount = random() < 0.65 ? between(1, 4) : 0;
      const firstOpenedAt = openCount
        ? new Date(createdAt.getTime() + between(20, 2880) * 60_000)
        : null;

      rows.push({
        ...base,
        ...email,
        openCount,
        firstOpenedAt,
        lastOpenedAt: firstOpenedAt,
      });

      for (let open = 0; open < openCount; open += 1) {
        opens.push({
          activityId: base.id,
          organizationId,
          occurredAt: new Date(
            (firstOpenedAt as Date).getTime() + open * between(5, 600) * 60_000
          ),
          clientType: pick(OPEN_CLIENT_TYPES),
        });
      }

      continue;
    }

    rows.push({
      ...base,
      title: onFacility
        ? titleFor(type)
        : pick(CONTACT_ACTIVITY_TITLES),
      description: pick(FOLLOW_UP_NOTES),
      ...(type === "FAX" && { faxNumber: faxNumber(), faxSentAt: createdAt }),
    });
  }

  const logged = rows.length - mirrored;

  // 3. The follow-up queue. Overdue rows matter most in a demo: a queue with
  // nothing late in it does not look like anyone's real Monday.
  let overdue = 0;

  for (let index = 0; index < profile.followUps; index += 1) {
    const onFacility = random() < 0.75 || !contacts.length;
    const facility = facilities[between(0, facilities.length - 1)];
    const contact = contactByFacility(index);
    const member = pick(ctx.assignable);
    const late = random() < 0.35;

    if (late) overdue += 1;

    rows.push({
      id: uuidv4(),
      title: pick(FOLLOW_UP_TITLES),
      description: pick(FOLLOW_UP_NOTES),
      activityType: pick(["CALL", "EMAIL", "MEETING"] as ActivityType[]),
      status: "PENDING",
      dueDate: late ? daysAgo(between(1, 21)) : daysAhead(between(0, 30)),
      recordId: onFacility ? facility.id : contact.id,
      createdBy: member.userId,
      organizationId,
      createdAt: daysAgo(between(22, Math.max(23, profile.windowDays))),
    });
  }

  // 4. A few cancelled ones, so the status filter has all three states.
  const cancelledCount = Math.max(2, Math.round(profile.followUps * 0.1));

  for (let index = 0; index < cancelledCount; index += 1) {
    const facility = facilities[between(0, facilities.length - 1)];
    const member = pick(ctx.assignable);
    const createdAt = daysAgo(between(10, profile.windowDays));

    rows.push({
      id: uuidv4(),
      title: pick(FOLLOW_UP_TITLES),
      description: pick(CANCELLED_NOTES),
      activityType: pick(["CALL", "MEETING"] as ActivityType[]),
      status: "CANCELLED",
      dueDate: daysAgo(between(1, 9)),
      recordId: facility.id,
      createdBy: member.userId,
      organizationId,
      createdAt,
    });
  }

  await prisma.activity.createMany({ data: rows, skipDuplicates: true });

  // Open events point at activities, so they only go in once those landed.
  const landed = new Set(
    (
      await prisma.activity.findMany({
        where: { id: { in: rows.map((row) => row.id) } },
        select: { id: true },
      })
    ).map((row) => row.id)
  );

  const liveOpens = opens.filter((event) => landed.has(event.activityId));
  await prisma.emailOpenEvent.createMany({ data: liveOpens });

  console.log(
    `Created ${rows.length} activities ` +
      `(${mirrored} mirrored from visit logs, ${profile.followUps} follow-ups, ` +
      `${overdue} of them overdue) and ${liveOpens.length} email opens`
  );

  return {
    mirrored,
    logged,
    followUps: profile.followUps,
    overdue,
    cancelled: cancelledCount,
    opens: liveOpens.length,
  };
}
