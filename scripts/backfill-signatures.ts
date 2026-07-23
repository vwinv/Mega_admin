/**
 * Crée les demandes de signature pour les approbations CEO déjà en attente.
 * Usage : npx tsx scripts/backfill-signatures.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  syncSignatureForCaisseOperation,
  syncSignatureForFacture,
  syncSignatureForJournalOperation,
} from "../src/lib/signatures";

async function main() {
  const [journal, caisse, factures] = await Promise.all([
    prisma.operation.findMany({
      where: { statutApprobation: "EN_ATTENTE_CEO" },
      select: { id: true, demandePar: true },
    }),
    prisma.operationCaisse.findMany({
      where: { statutApprobation: "EN_ATTENTE_CEO" },
      select: { id: true, demandePar: true },
    }),
    prisma.facture.findMany({
      where: { statutApprobation: "EN_ATTENTE_CEO" },
      select: { id: true, demandePar: true },
    }),
  ]);

  let count = 0;

  for (const op of journal) {
    await syncSignatureForJournalOperation(op.id, {
      id: "",
      nom: op.demandePar ?? "Système",
    });
    count++;
  }

  for (const op of caisse) {
    await syncSignatureForCaisseOperation(op.id, {
      id: "",
      nom: op.demandePar ?? "Système",
    });
    count++;
  }

  for (const f of factures) {
    await syncSignatureForFacture(f.id, {
      id: "",
      nom: f.demandePar ?? "Système",
    });
    count++;
  }

  console.log(`Backfill terminé : ${count} demande(s) de signature synchronisée(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
