import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. Configurez une base PostgreSQL (Vercel : Settings → Environment Variables).",
    );
  }
  return url;
}

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
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 20_000,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool(buildPoolConfig(getDatabaseUrl()));
  globalForPrisma.prismaPool = pool;
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export function getDatabaseKind(): "postgresql" {
  return "postgresql";
}
