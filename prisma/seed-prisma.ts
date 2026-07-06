import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";

export function createSeedPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./data/mega.db";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    const pool = new Pool({ connectionString: url });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}
