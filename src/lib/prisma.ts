import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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
  const needsSsl =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=require/i.test(connectionString) ||
    /\.render\.com/i.test(connectionString) ||
    /\.neon\.tech/i.test(connectionString) ||
    /\.supabase\.co/i.test(connectionString) ||
    /\.vercel-storage\.com/i.test(connectionString) ||
    /\.prisma\.io/i.test(connectionString);

  return {
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool(buildPoolConfig(getDatabaseUrl()));
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = createPrismaClient();
  // Cache le client (dev + prod serverless Vercel)
  globalForPrisma.prisma = client;
  return client;
}

/** Client lazy : le build Next n'exige pas une DB joignable au chargement du module. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function getDatabaseKind(): "postgresql" {
  return "postgresql";
}
