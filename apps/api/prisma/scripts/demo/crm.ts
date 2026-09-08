import type { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import {
  COMPANY_NAMES,
  COMPANY_STATUSES,
  CONTACT_FIRST,
  CONTACT_LAST,
  CONTACT_NOTES,
  CONTACT_STAGES,
  CONTACT_TITLES,
  INDUSTRIES,
} from "./catalog/crm";
import {
  boardRow,
  type DemoBoardRow,
  collectValues,
  historyRow,
  persistRecords,
  type DemoContext,
  type FieldValueRow,
} from "./context";
import { anyAddress } from "./address";
import { between, daysAgo, pick, random } from "./random";

export type DemoCompany = { id: string; name: string };
export type DemoContact = {
  id: string;
  name: string;
  title: string;
  email: string;
};

const phone = () => `(217) ${between(200, 899)}-${between(1000, 9999)}`;

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18);

// The record name carries a unique index, so contact names are drawn from a
// shuffled pool of every first/last pairing rather than picked at random and
// hoping two of thirty-six never collide.
const contactNamePool = () => {
  const pool = CONTACT_FIRST.flatMap((first) =>
    CONTACT_LAST.map((last) => `${first} ${last}`)
  );

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }

  return pool;
};

export async function seedCrm(
  prisma: PrismaClient,
  ctx: DemoContext
): Promise<{ companies: DemoCompany[]; contacts: DemoContact[] }> {
  const { organizationId, profile } = ctx;
  const companyModuleId = ctx.moduleIdFor("COMPANY");
  const contactModuleId = ctx.moduleIdFor("CONTACT");
  const companyFields = ctx.fieldsFor("COMPANY");
  const contactFields = ctx.fieldsFor("CONTACT");

  const companies: DemoCompany[] = [];
  const rows: DemoBoardRow[] = [];
  const values: FieldValueRow[] = [];
  const history: Prisma.HistoryCreateManyInput[] = [];

  for (const name of COMPANY_NAMES.slice(0, profile.companies)) {
    const id = uuidv4();
    const owner = pick(ctx.assignable);
    const createdAt = daysAgo(
      between(
        Math.round(profile.windowDays * 0.6),
        Math.round(profile.windowDays * 1.3)
      )
    );

    companies.push({ id, name });
    rows.push(
      boardRow({
        id,
        name,
        moduleKey: "COMPANY",
        moduleId: companyModuleId,
        organizationId,
        assignedTo: owner.userId,
        createdAt,
      })
    );

    collectValues(
      id,
      companyFields,
      [
        ["Website", `https://www.${slug(name)}.example`],
        ["Industry", pick(INDUSTRIES)],
        ["Phone", phone()],
        ["Address", anyAddress()],
        ["Status", pick(COMPANY_STATUSES)],
        ["Notes", "Imported during the territory review"],
      ],
      organizationId,
      values
    );

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
  }

  const companyIds = await persistRecords(prisma, { rows, values, history });
  const liveCompanies = companies.filter((company) =>
    companyIds.has(company.id)
  );

  // Every contact belongs to a company, so the Phonebook groups the way the
  // Companies page implies it should.
  const contacts: DemoContact[] = [];
  const contactRows: DemoBoardRow[] = [];
  const contactValues: FieldValueRow[] = [];
  const contactHistory: Prisma.HistoryCreateManyInput[] = [];
  const relations: Prisma.BoardRelationCreateManyInput[] = [];
  const names = contactNamePool();
  let cursor = 0;

  for (const company of liveCompanies) {
    for (let index = 0; index < profile.contactsPerCompany; index += 1) {
      const name = names[cursor];
      cursor += 1;
      if (!name) break;

      const id = uuidv4();
      const title = pick(CONTACT_TITLES);
      const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${slug(
        company.name
      )}.example`;
      const owner = pick(ctx.assignable);
      const createdAt = daysAgo(
        between(
          Math.round(profile.windowDays * 0.2),
          Math.round(profile.windowDays * 1.15)
        )
      );

      contacts.push({ id, name, title, email });
      contactRows.push(
        boardRow({
          id,
          name,
          moduleKey: "CONTACT",
          moduleId: contactModuleId,
          organizationId,
          assignedTo: owner.userId,
          createdAt,
        })
      );

      collectValues(
        id,
        contactFields,
        [
          ["Title", title],
          ["Email", email],
          ["Phone", phone()],
          // A link field stores the id of the record it points at.
          ["Company", company.id],
          ["Address", anyAddress()],
          ["Lifecycle Stage", pick(CONTACT_STAGES)],
          ["Notes", pick(CONTACT_NOTES)],
        ],
        organizationId,
        contactValues
      );

      relations.push({
        sourceId: id,
        targetId: company.id,
        relationType: "COMPANY_LINK",
        organizationId,
      });

      contactHistory.push(
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
    }
  }

  const contactIds = await persistRecords(prisma, {
    rows: contactRows,
    values: contactValues,
    history: contactHistory,
    relations,
  });

  const liveContacts = contacts.filter((contact) => contactIds.has(contact.id));

  console.log(
    `Created ${liveCompanies.length} companies and ${liveContacts.length} contacts`
  );

  if (!liveContacts.length) {
    throw new Error(
      "No contacts landed, so facilities would have nothing to link to."
    );
  }

  return { companies: liveCompanies, contacts: liveContacts };
}
