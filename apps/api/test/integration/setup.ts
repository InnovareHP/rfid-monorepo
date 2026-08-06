import { config } from "dotenv";

config();

// Integration specs write and delete rows, so they refuse to touch the URL the
// app runs on. Point TEST_DATABASE_URL at a throwaway database.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required. Integration specs will not run against DATABASE_URL."
  );
}

if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must not equal DATABASE_URL. Use a separate database."
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
