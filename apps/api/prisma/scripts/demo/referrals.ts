import type { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import {
  ASSESSMENT_TYPES,
  CLINICIANS,
  DENIAL_REASONS,
  PATIENT_NAMES,
  PAYORS,
} from "./catalog";
import {
  boardRow,
  type DemoBoardRow,
  collectValues,
  historyRow,
  persistRecords,
  type DemoContext,
  type FieldValueRow,
} from "./context";
import type { DemoFacility } from "./facilities";
import { between, daysAgo, isoDate, pick, random } from "./random";

const REFERRAL_COUNT = 320;

// Volume rises over the window so the trend charts slope instead of sitting
// flat, and a fifth are rejected so denial reporting has something to show.
export async function seedReferrals(
  prisma: PrismaClient,
  ctx: DemoContext,
  facilities: DemoFacility[],
  contacts: { id: string; name: string }[]
): Promise<number> {
  const { organizationId } = ctx;
  const moduleId = ctx.moduleIdFor("REFERRAL");
  const fields = ctx.fieldsFor("REFERRAL");
  const statusField = fields.find(
    (field) => field.fieldName === "Admission Status"
  );

  const rows: DemoBoardRow[] = [];
  const values: FieldValueRow[] = [];
  const history: Prisma.HistoryCreateManyInput[] = [];
  const relations: Prisma.BoardRelationCreateManyInput[] = [];

  for (let index = 0; index < REFERRAL_COUNT; index += 1) {
    const id = uuidv4();
    // Weighted towards recent months.
    const age = Math.floor(Math.pow(random(), 1.7) * 330);
    const createdAt = daysAgo(age);

    // A handful of facilities carry most of the volume, which is what makes a
    // top-sources report worth looking at.
    const facility =
      random() < 0.55
        ? facilities[between(0, 5)]
        : facilities[between(0, facilities.length - 1)];

    const patient = pick(PATIENT_NAMES);
    const name = `${patient} — ${isoDate(createdAt)}-${index}`;
    const owner = pick(ctx.assignable);
    const admitted = random() < 0.62;
    const rejected = !admitted && random() < 0.5;
    const status = admitted ? "Admitted" : rejected ? "Denied" : "Pending";
    const contact = contacts[between(0, contacts.length - 1)];

    rows.push(
      boardRow({
        id,
        name,
        moduleKey: "REFERRAL",
        moduleId,
        organizationId,
        assignedTo: owner.userId,
        createdAt,
      })
    );

    relations.push({
      sourceId: id,
      targetId: facility.id,
      relationType: "REFERRAL_LINK",
      organizationId,
    });

    const pairs: [string, string][] = [
      ["Referral Date", isoDate(createdAt)],
      ["Facility", facility.id],
      ["Patient Name", patient],
      ["Contact", contact.name],
      ["Assessor", pick(CLINICIANS)],
      ["Payor", pick(PAYORS)],
      ["Type of Assessment", pick(ASSESSMENT_TYPES)],
      ["Admission Status", status],
      ["Contact Number", `(217) ${between(200, 899)}-${between(1000, 9999)}`],
    ];

    if (rejected) pairs.push(["Reason", pick(DENIAL_REASONS)]);

    const actioned = new Date(createdAt);
    actioned.setDate(actioned.getDate() + between(1, 9));
    if (admitted) pairs.push(["Action Date", isoDate(actioned)]);

    collectValues(id, fields, pairs, organizationId, values);

    history.push(
      historyRow({
        recordId: id,
        action: "create",
        column: "Referrer",
        newValue: name,
        createdBy: owner.userId,
        organizationId,
        createdAt,
      })
    );

    // A referral that resolved was Pending first, so the timeline shows the
    // move rather than a record that was born decided.
    if (statusField && status !== "Pending") {
      history.push(
        historyRow({
          recordId: id,
          action: "update",
          column: "Admission Status",
          oldValue: "Pending",
          newValue: status,
          fieldId: statusField.id,
          createdBy: owner.userId,
          organizationId,
          createdAt: actioned,
        })
      );
    }
  }

  const ids = await persistRecords(prisma, {
    rows,
    values,
    history,
    relations,
  });

  console.log(`Created ${ids.size} referrals linked to facilities`);

  return ids.size;
}
