import "dotenv/config";
import { createSeedPrisma } from "../prisma/seed-prisma";

function parseBnSequence(
  numeroPiece: string | null
): { year: number; seq: number } | null {
  if (!numeroPiece) return null;
  const match = numeroPiece.trim().match(/^BN-(\d{4})-(\d+)$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), seq: parseInt(match[2], 10) };
}

function parseCaSequence(
  numeroPiece: string | null
): { year: number; seq: number } | null {
  if (!numeroPiece) return null;
  const match = numeroPiece.trim().match(/^CA-(\d{4})-(\d+)$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), seq: parseInt(match[2], 10) };
}

async function maxCounters(
  rows: { numeroPiece: string | null }[],
  parser: (n: string | null) => { year: number; seq: number } | null
): Promise<Map<number, number>> {
  const counters = new Map<number, number>();
  for (const row of rows) {
    const parsed = parser(row.numeroPiece);
    if (!parsed) continue;
    counters.set(parsed.year, Math.max(counters.get(parsed.year) ?? 0, parsed.seq));
  }
  return counters;
}

async function main() {
  const prisma = createSeedPrisma();
  const scope = process.argv.includes("--caisse") ? "caisse" : "journal";
  const both = process.argv.includes("--all");

  async function backfillJournal() {
    const counters = await maxCounters(
      await prisma.operation.findMany({
        where: { numeroPiece: { startsWith: "BN-" } },
        select: { numeroPiece: true },
      }),
      parseBnSequence
    );

    const ops = await prisma.operation.findMany({
      where: {
        OR: [{ numeroPiece: null }, { numeroPiece: "" }],
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    for (const op of ops) {
      const year = op.date?.getUTCFullYear() ?? op.createdAt.getUTCFullYear();
      const next = (counters.get(year) ?? 0) + 1;
      counters.set(year, next);
      const numero = `BN-${year}-${String(next).padStart(4, "0")}`;
      await prisma.operation.update({
        where: { id: op.id },
        data: { numeroPiece: numero },
      });
      console.log(`  ${numero}  ${op.libelle.slice(0, 50)}`);
    }

    console.log(`\nJournal : ${ops.length} écriture(s) numérotée(s).`);
    return ops.length;
  }

  async function backfillCaisse() {
    const counters = await maxCounters(
      await prisma.operationCaisse.findMany({
        where: { numeroPiece: { startsWith: "CA-" } },
        select: { numeroPiece: true },
      }),
      parseCaSequence
    );

    const ops = await prisma.operationCaisse.findMany({
      where: {
        OR: [{ numeroPiece: null }, { numeroPiece: "" }],
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    for (const op of ops) {
      const year = op.date?.getUTCFullYear() ?? op.createdAt.getUTCFullYear();
      const next = (counters.get(year) ?? 0) + 1;
      counters.set(year, next);
      const numero = `CA-${year}-${String(next).padStart(4, "0")}`;
      await prisma.operationCaisse.update({
        where: { id: op.id },
        data: { numeroPiece: numero },
      });
      console.log(`  ${numero}  ${op.libelle.slice(0, 50)}`);
    }

    console.log(`\nCaisse : ${ops.length} écriture(s) numérotée(s).`);
    return ops.length;
  }

  console.log("MEGA SN · Attribution des n° de pièce\n");

  if (both) {
    console.log("── Journal banque ──");
    await backfillJournal();
    console.log("\n── Petite caisse ──");
    await backfillCaisse();
  } else if (scope === "caisse") {
    await backfillCaisse();
  } else {
    await backfillJournal();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
