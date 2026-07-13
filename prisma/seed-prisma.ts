import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool, type PoolConfig } from "pg";

function buildPoolConfig(connectionString: string): PoolConfig {
  const isRemote =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=require/i.test(connectionString) ||
    /\.render\.com/i.test(connectionString) ||
    /\.neon\.tech/i.test(connectionString) ||
    /\.supabase\.co/i.test(connectionString) ||
    /\.vercel-storage\.com/i.test(connectionString) ||
    /\.prisma\.io/i.test(connectionString);

  let url = connectionString;
  if (isRemote) {
    url = connectionString
      .replace(/[?&]sslmode=[^&]*/gi, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }

  return {
    connectionString: url,
    ...(isRemote
      ? {
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15_000,
        }
      : {}),
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
