import type { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import {
  CITIES,
  COUNTIES,
  FACILITY_CONTACT_FIELDS,
  FACILITY_NOTES,
  FACILITY_PREFIX,
  FACILITY_SUFFIX,
  FACILITY_TYPES,
  LEAD_STAGES,
} from "./catalog/facilities";
import {
  boardRow,
  type DemoBoardRow,
  collectValues,
  historyRow,
  persistRecords,
  type DemoContext,
  type FieldValueRow,
} from "./context";
import { addressLine } from "./address";
import type { DemoContact } from "./crm";
import { between, daysAgo, pick, random } from "./random";

export type DemoFacility = { id: string; name: string; county: string };

export async function seedFacilities(
  prisma: PrismaClient,
  ctx: DemoContext,
  contacts: DemoContact[]
): Promise<DemoFacility[]> {
  const { organizationId, profile } = ctx;
  const moduleId = ctx.moduleIdFor("LEAD");
  const fields = ctx.fieldsFor("LEAD");
  const statusField = fields.find((field) => field.fieldName === "Status");

  const facilities: DemoFacility[] = [];
  const rows: DemoBoardRow[] = [];
  const values: FieldValueRow[] = [];
  const history: Prisma.HistoryCreateManyInput[] = [];
  const relations: Prisma.BoardRelationCreateManyInput[] = [];

  // At least two suffixes per prefix, which is what makes fuzzy duplicate
  // detection worth demonstrating without planting an exact collision.
  const prefixes = FACILITY_PREFIX.slice(0, profile.facilityPrefixes);
  const suffixes = FACILITY_SUFFIX.slice(0, profile.facilitySuffixes);

  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      const name = `${prefix} ${suffix}`;
      const id = uuidv4();
      const county = pick(COUNTIES);
      const city = CITIES[COUNTIES.indexOf(county)] ?? pick(CITIES);
      const zip = String(between(60000, 62999));
      const owner = pick(ctx.assignable);
      const createdAt = daysAgo(
        between(
          Math.round(profile.windowDays * 0.4),
          Math.round(profile.windowDays * 1.2)
        )
      );
      const status = pick(LEAD_STAGES);

      facilities.push({ id, name, county });
      rows.push(
        boardRow({
          id,
          name,
          moduleKey: "LEAD",
          moduleId,
          organizationId,
          assignedTo: owner.userId,
          createdAt,
        })
      );

      const pairs: [string, string][] = [
        ["Number of Beds", String(between(40, 220))],
        ["Type of Facility", pick(FACILITY_TYPES)],
        ["Address", addressLine(city, zip)],
        ["County", county],
        ["City", city],
        ["State", "IL"],
        ["Zip Code", zip],
        ["Phone", `(217) ${between(200, 899)}-${between(1000, 9999)}`],
        ["Psychiatric Services", pick(["Yes", "No"])],
        ["Status", status],
        ["Notes", pick(FACILITY_NOTES)],
      ];

      // The three CONTACT_LINK columns point at real contacts, so the record
      // panel resolves a name instead of showing an empty link.
      for (const fieldName of FACILITY_CONTACT_FIELDS) {
        const contact = contacts[between(0, contacts.length - 1)];
        pairs.push([fieldName, contact.id]);
        relations.push({
          sourceId: id,
          targetId: contact.id,
          relationType: "CONTACT_LINK",
          organizationId,
        });
      }

      collectValues(id, fields, pairs, organizationId, values);

      history.push(
        historyRow({
          recordId: id,
          action: "create",
          column: "Name",
          newValue: name,
          createdBy: owner.userId,
          organizationId,
          createdAt,
        })
      );

      // Roughly half the facilities moved stage once, which is what the history
      // report and the stage funnel read.
      if (statusField && random() < 0.5) {
        const movedAt = daysAgo(between(1, Math.round(profile.windowDays / 3)));
        history.push(
          historyRow({
            recordId: id,
            action: "update",
            column: "Status",
            oldValue: pick(LEAD_STAGES),
            newValue: status,
            fieldId: statusField.id,
            createdBy: pick(ctx.assignable).userId,
            organizationId,
            createdAt: movedAt,
          })
        );
      }
    }
  }

  const ids = await persistRecords(prisma, {
    rows,
    values,
    history,
    relations,
  });
  const live = facilities.filter((facility) => ids.has(facility.id));

  console.log(`Created ${live.length} facilities`);

  if (!live.length) {
    throw new Error(
      "No facilities landed, so referrals would have nothing to link to."
    );
  }

  return live;
}
