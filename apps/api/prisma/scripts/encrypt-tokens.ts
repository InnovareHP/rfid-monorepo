import { PrismaClient } from "@prisma/client";
import { encryptString, isEncrypted } from "../../src/lib/crypto/crypto";

const raw = new PrismaClient();

const TABLES = [
  { model: raw.gmailToken, label: "GmailToken" },
  { model: raw.outlookToken, label: "OutlookToken" },
  { model: raw.googleCalendarToken, label: "GoogleCalendarToken" },
  { model: raw.outlookCalendarToken, label: "OutlookCalendarToken" },
] as const;

async function run() {
  for (const { model, label } of TABLES) {
    const rows: any[] = await (model as any).findMany();
    let touched = 0;
    for (const row of rows) {
      const patch: any = {};
      if (row.accessToken && !isEncrypted(row.accessToken)) {
        patch.accessToken = encryptString(row.accessToken);
      }
      if (row.refreshToken && !isEncrypted(row.refreshToken)) {
        patch.refreshToken = encryptString(row.refreshToken);
      }
      if (Object.keys(patch).length === 0) continue;
      await (model as any).update({ where: { id: row.id }, data: patch });
      touched++;
    }
    console.log(`[${label}] encrypted ${touched}/${rows.length}`);
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
