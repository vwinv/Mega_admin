import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";

export function createSeedPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL manquant pour le seed.");
  }

  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
