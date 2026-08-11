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
  {
    label: "BlastRecipient",
    fields: ["email"],
    load: () =>
      raw.blastRecipient.findMany({ select: { id: true, email: true } }),
    patch: (id, data) => raw.blastRecipient.update({ where: { id }, data }),
  },
  {
    label: "SupportTicket",
    fields: ["title", "subject", "description"],
    load: () => raw.supportTicket.findMany(),
    patch: (id, data) => raw.supportTicket.update({ where: { id }, data }),
  },
  {
    label: "SupportTicketMessage",
    fields: ["message"],
    load: () =>
      raw.supportTicketMessage.findMany({ select: { id: true, message: true } }),
    patch: (id, data) =>
      raw.supportTicketMessage.update({ where: { id }, data }),
  },
  {
    label: "SupportHistory",
    fields: ["message"],
    load: () =>
      raw.supportHistory.findMany({ select: { id: true, message: true } }),
    patch: (id, data) => raw.supportHistory.update({ where: { id }, data }),
  },
  {
    label: "SupportTicketRating",
    fields: ["comment"],
    load: () =>
      raw.supportTicketRating.findMany({ select: { id: true, comment: true } }),
    patch: (id, data) => raw.supportTicketRating.update({ where: { id }, data }),
  },
  {
    label: "SupportLiveChat",
    fields: ["message"],
    load: () =>
      raw.supportLiveChat.findMany({ select: { id: true, message: true } }),
    patch: (id, data) => raw.supportLiveChat.update({ where: { id }, data }),
  },
  {
    label: "SupportLiveChatMessage",
    fields: ["message"],
    load: () =>
      raw.supportLiveChatMessage.findMany({
        select: { id: true, message: true },
      }),
    patch: (id, data) =>
      raw.supportLiveChatMessage.update({ where: { id }, data }),
  },
  // Added to ENCRYPTED_FIELDS after the first backfill, so rows written before
  // each field was listed are still plaintext and nothing else converts them.
  {
    label: "Task",
    fields: ["name", "description"],
    load: () =>
      raw.task.findMany({ select: { id: true, name: true, description: true } }),
    patch: (id, data) => raw.task.update({ where: { id }, data }),
  },
  {
    label: "TaskComment",
    fields: ["body"],
    load: () => raw.taskComment.findMany({ select: { id: true, body: true } }),
    patch: (id, data) => raw.taskComment.update({ where: { id }, data }),
  },
  {
    label: "TaskChecklistItem",
    fields: ["title"],
    load: () =>
      raw.taskChecklistItem.findMany({ select: { id: true, title: true } }),
    patch: (id, data) => raw.taskChecklistItem.update({ where: { id }, data }),
  },
  {
    label: "TaskActivity",
    fields: ["oldValue", "newValue"],
    load: () => raw.taskActivity.findMany(),
    patch: (id, data) => raw.taskActivity.update({ where: { id }, data }),
  },
  {
    label: "Booking",
    fields: ["inviteeName", "inviteeEmail", "inviteeNotes"],
    load: () => raw.booking.findMany(),
    patch: (id, data) => raw.booking.update({ where: { id }, data }),
  },
  {
    label: "ContractAgreement",
    fields: ["signerName", "signerEmail"],
    load: () => raw.contractAgreement.findMany(),
    patch: (id, data) => raw.contractAgreement.update({ where: { id }, data }),
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
