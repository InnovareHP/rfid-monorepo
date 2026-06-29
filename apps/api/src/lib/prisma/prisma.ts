import { PrismaClient } from "@prisma/client";
import { encryptionExtension } from "./encryption-extension";

declare global {
  var prisma: PrismaClient | undefined;
}

function buildClient(): PrismaClient {
  const base = new PrismaClient({ log: ["warn", "error"] });
  return base.$extends(encryptionExtension) as unknown as PrismaClient;
}

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prisma || buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
