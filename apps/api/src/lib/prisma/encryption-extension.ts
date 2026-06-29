import { Prisma } from "@prisma/client";
import { decryptNullable, encryptNullable } from "../crypto/crypto";

type FieldMap = Record<string, readonly string[]>;

const ENCRYPTED_FIELDS: FieldMap = {
  GmailToken: ["accessToken", "refreshToken"],
  OutlookToken: ["accessToken", "refreshToken"],
  GoogleCalendarToken: ["accessToken", "refreshToken"],
  OutlookCalendarToken: ["accessToken", "refreshToken"],
  FieldPersonInformation: ["contactNumber", "email", "address"],
  Activity: ["emailBody", "emailSubject", "recipientEmail", "senderEmail"],
  History: ["oldValue", "newValue"],
};

function encryptObj(model: string, data: any) {
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

function decryptObj(model: string, data: any) {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || typeof data !== "object") return data;
  for (const f of fields) {
    if (f in data && typeof data[f] === "string") {
      data[f] = decryptNullable(data[f]);
    }
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
