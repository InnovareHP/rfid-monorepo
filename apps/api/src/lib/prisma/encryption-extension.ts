import { Prisma } from "@prisma/client";
import { decryptNullable, encryptNullable } from "../crypto/crypto";

type FieldMap = Record<string, readonly string[]>;

const ENCRYPTED_FIELDS: FieldMap = {
  GmailToken: ["accessToken", "refreshToken"],
  OutlookToken: ["accessToken", "refreshToken"],
  GoogleCalendarToken: ["accessToken", "refreshToken"],
  OutlookCalendarToken: ["accessToken", "refreshToken"],
  FieldPersonInformation: ["contactNumber", "email", "address"],
  TwoFactor: ["secret", "backupCodes"],
  OrgIntegration: ["apiKey"],
  Activity: [
    "emailBody",
    "emailSubject",
    "recipientEmail",
    "senderEmail",
    "faxNumber",
  ],
  History: ["oldValue", "newValue"],
  FieldValue: ["value"],
  Board: ["recordName"],
  Task: ["name", "description"],
  TaskComment: ["body"],
  TaskChecklistItem: ["title"],
  TaskActivity: ["oldValue", "newValue"],
};

// Relation key → model, so encrypted models are handled when nested
// under another model's include/select or nested-write payload.
const RELATION_MODELS: Record<string, string> = {
  values: "FieldValue",
  contactValue: "FieldPersonInformation",
  fieldvalue: "FieldValue",
  record: "Board",
  history: "History",
  History: "History",
  activities: "Activity",
  Activity: "Activity",
  Board: "Board",
  source: "Board",
  target: "Board",
  task: "Task",
  tasks: "Task",
  subtasks: "Task",
  parentTask: "Task",
  comments: "TaskComment",
  checklistItems: "TaskChecklistItem",
  taskActivities: "TaskActivity",
  blockerTask: "Task",
  blockedTask: "Task",
  blocking: "TaskDependency",
  blockedBy: "TaskDependency",
};

function encryptOwnFields(model: string, data: any): any {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || typeof data !== "object") return data;
  const out: any = { ...data };
  for (const f of fields) {
    if (f in out) {
      const v = out[f];
      if (v && typeof v === "object" && "set" in v) {
        out[f] = { ...v, set: encryptNullable(v.set) };
      } else {
        out[f] = encryptNullable(v);
      }
    }
  }
  return out;
}

function encryptObj(model: string, data: any): any {
  if (!data || typeof data !== "object") return data;
  const out = encryptOwnFields(model, data);
  for (const [key, childModel] of Object.entries(RELATION_MODELS)) {
    const nested = out[key];
    if (!nested || typeof nested !== "object") continue;
    out[key] = encryptNestedWrite(childModel, nested);
  }
  return out;
}

function mapMaybeArray(value: any, fn: (v: any) => any): any {
  return Array.isArray(value) ? value.map(fn) : fn(value);
}

function encryptNestedWrite(model: string, nested: any): any {
  const out: any = { ...nested };
  if (out.create) {
    out.create = mapMaybeArray(out.create, (d: any) => encryptObj(model, d));
  }
  if (out.createMany?.data) {
    out.createMany = {
      ...out.createMany,
      data: mapMaybeArray(out.createMany.data, (d: any) =>
        encryptObj(model, d)
      ),
    };
  }
  if (out.update) {
    out.update = mapMaybeArray(out.update, (u: any) =>
      u && typeof u === "object" && "data" in u
        ? { ...u, data: encryptObj(model, u.data) }
        : encryptObj(model, u)
    );
  }
  if (out.updateMany) {
    out.updateMany = mapMaybeArray(out.updateMany, (u: any) =>
      u && typeof u === "object" && "data" in u
        ? { ...u, data: encryptObj(model, u.data) }
        : encryptObj(model, u)
    );
  }
  if (out.upsert) {
    out.upsert = mapMaybeArray(out.upsert, (u: any) => ({
      ...u,
      ...(u.create ? { create: encryptObj(model, u.create) } : {}),
      ...(u.update ? { update: encryptObj(model, u.update) } : {}),
    }));
  }
  if (out.connectOrCreate) {
    out.connectOrCreate = mapMaybeArray(out.connectOrCreate, (c: any) =>
      c?.create ? { ...c, create: encryptObj(model, c.create) } : c
    );
  }
  return out;
}

function decryptObj(model: string, data: any): any {
  if (!data || typeof data !== "object") return data;
  const fields = ENCRYPTED_FIELDS[model];
  if (fields) {
    for (const f of fields) {
      if (f in data && typeof data[f] === "string") {
        data[f] = decryptNullable(data[f]);
      }
    }
  }
  for (const [key, childModel] of Object.entries(RELATION_MODELS)) {
    const nested = data[key];
    if (!nested || typeof nested !== "object") continue;
    decryptResult(childModel, nested);
  }
  return data;
}

function decryptResult(model: string, result: any): any {
  if (result == null) return result;
  if (Array.isArray(result)) {
    for (const row of result) decryptObj(model, row);
    return result;
  }
  return decryptObj(model, result);
}

export const encryptionExtension = Prisma.defineExtension({
  name: "phi-encryption",
  query: {
    $allModels: {
      async create({ model, args, query }) {
        args.data = encryptObj(model, args.data);
        const r = await query(args);
        return decryptResult(model, r);
      },
      async createMany({ model, args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((d: any) => encryptObj(model, d));
        } else {
          args.data = encryptObj(model, args.data);
        }
        return query(args);
      },
      async update({ model, args, query }) {
        args.data = encryptObj(model, args.data);
        const r = await query(args);
        return decryptResult(model, r);
      },
      async updateMany({ model, args, query }) {
        args.data = encryptObj(model, args.data);
        return query(args);
      },
      async upsert({ model, args, query }) {
        args.create = encryptObj(model, args.create);
        args.update = encryptObj(model, args.update);
        const r = await query(args);
        return decryptResult(model, r);
      },
      async findUnique({ model, args, query }) {
        return decryptResult(model, await query(args));
      },
      async findUniqueOrThrow({ model, args, query }) {
        return decryptResult(model, await query(args));
      },
      async findFirst({ model, args, query }) {
        return decryptResult(model, await query(args));
      },
      async findFirstOrThrow({ model, args, query }) {
        return decryptResult(model, await query(args));
      },
      async findMany({ model, args, query }) {
        return decryptResult(model, await query(args));
      },
    },
  },
});
