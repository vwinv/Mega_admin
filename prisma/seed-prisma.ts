import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool, type PoolConfig } from "pg";

function buildPoolConfig(connectionString: string): PoolConfig {
  const needsSsl =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=require/i.test(connectionString) ||
    /\.render\.com/i.test(connectionString);

  return {
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function createSeedPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL manquant pour le seed.");
  }

  const pool = new Pool(buildPoolConfig(url));
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
