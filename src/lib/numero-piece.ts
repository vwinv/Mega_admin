import type { PrismaClient } from "@/generated/prisma/client";

function yearFromDate(date: Date | null): number {
  return date?.getUTCFullYear() ?? new Date().getUTCFullYear();
}

async function nextFromPrefix(
  prisma: PrismaClient,
  prefix: string,
  fetchLast: (p: string) => Promise<{ numeroPiece: string | null } | null>
): Promise<string> {
  const last = await fetchLast(prefix);
  let n = 1;
  if (last?.numeroPiece?.startsWith(prefix)) {
    const tail = parseInt(last.numeroPiece.slice(prefix.length), 10);
    if (!Number.isNaN(tail)) n = tail + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Numéro de pièce journal banque : BN-2026-0001 */
export async function nextNumeroPieceBanque(
  prisma: PrismaClient,
  date: Date | null
): Promise<string> {
  const prefix = `BN-${yearFromDate(date)}-`;
  return nextFromPrefix(prisma, prefix, (p) =>
    prisma.operation.findFirst({
      where: { numeroPiece: { startsWith: p } },
      orderBy: { numeroPiece: "desc" },
      select: { numeroPiece: true },
    })
  );
}

/** Numéro de pièce petite caisse : CA-2026-0001 */
export async function nextNumeroPieceCaisse(
  prisma: PrismaClient,
  date: Date | null
): Promise<string> {
  const prefix = `CA-${yearFromDate(date)}-`;
  return nextFromPrefix(prisma, prefix, (p) =>
    prisma.operationCaisse.findFirst({
      where: { numeroPiece: { startsWith: p } },
      orderBy: { numeroPiece: "desc" },
      select: { numeroPiece: true },
    })
  );
}

export async function ensureNumeroFactureUnique(
  prisma: PrismaClient,
  numero: string,
  excludeId?: string
): Promise<string | null> {
  const trimmed = numero.trim();
  if (!trimmed) return "Le numéro de facture est obligatoire.";
  const existing = await prisma.facture.findFirst({
    where: {
      numero: trimmed,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (existing) return `Le numéro de facture « ${trimmed} » existe déjà.`;
  return null;
}
