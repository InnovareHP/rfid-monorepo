import { PrismaClient } from "@prisma/client";
import { encryptString, isEncrypted } from "../../src/lib/crypto/crypto";

const raw = new PrismaClient();

interface Spec {
  label: string;
  fields: string[];
  load(): Promise<any[]>;
  patch(id: string, data: Record<string, string>): Promise<unknown>;
}

const SPECS: Spec[] = [
  {
    label: "FieldPersonInformation",
    fields: ["contactNumber", "email", "address"],
    load: () => raw.fieldPersonInformation.findMany(),
    patch: (id, data) =>
      raw.fieldPersonInformation.update({ where: { id }, data }),
  },
  {
    label: "Activity",
    fields: ["emailBody", "emailSubject", "recipientEmail", "senderEmail"],
    load: () => raw.activity.findMany(),
    patch: (id, data) => raw.activity.update({ where: { id }, data }),
  },
  {
    label: "History",
    fields: ["oldValue", "newValue"],
    load: () => raw.history.findMany(),
    patch: (id, data) => raw.history.update({ where: { id }, data }),
  },
  {
    label: "FieldValue",
    fields: ["value"],
    load: () =>
      raw.fieldValue.findMany({ select: { id: true, value: true } }),
    patch: (id, data) => raw.fieldValue.update({ where: { id }, data }),
  },
  {
    label: "Board",
    fields: ["recordName"],
    load: () => raw.board.findMany({ select: { id: true, recordName: true } }),
    patch: (id, data) => raw.board.update({ where: { id }, data }),
  },
];

async function run() {
  for (const spec of SPECS) {
    const rows = await spec.load();
    let touched = 0;
    for (const row of rows) {
      const patch: Record<string, string> = {};
      for (const f of spec.fields) {
        const v = row[f];
        if (v && typeof v === "string" && !isEncrypted(v)) {
          patch[f] = encryptString(v);
        }
      }
      if (Object.keys(patch).length === 0) continue;
      await spec.patch(row.id, patch);
      touched++;
    }
    console.log(`[${spec.label}] encrypted ${touched}/${rows.length}`);
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
