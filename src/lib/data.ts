import { prisma } from "@/lib/prisma";
import { OperationRow } from "@/lib/types";

function serializeOp(
  op: {
    id: string;
    date: Date | null;
    numeroPiece: string | null;
    libelle: string;
    categorieId: string;
    categorie: { nom: string; codeCompte: string };
    codeBudgetaireId: string | null;
    codeBudgetaire: { code: string } | null;
    modePaiement?: string | null;
    entree: number | null;
    sortie: number | null;
    observations: string | null;
    validePar: string | null;
    statutApprobation?: string;
    demandePar?: string | null;
    approuvePar?: string | null;
    motifRefus?: string | null;
  },
  soldeCumule?: number
): OperationRow {
  return {
    id: op.id,
    date: op.date?.toISOString() ?? null,
    numeroPiece: op.numeroPiece,
    libelle: op.libelle,
    categorieId: op.categorieId,
    categorieNom: op.categorie.nom,
    codeCompte: op.categorie.codeCompte,
    codeBudgetaireId: op.codeBudgetaireId,
    codeBudgetaire: op.codeBudgetaire?.code ?? null,
    modePaiement: op.modePaiement ?? null,
    entree: op.entree,
    sortie: op.sortie,
    observations: op.observations,
    validePar: op.validePar,
    statutApprobation: op.statutApprobation ?? "APPROUVE",
    demandePar: op.demandePar ?? null,
    approuvePar: op.approuvePar ?? null,
    motifRefus: op.motifRefus ?? null,
    soldeCumule,
  };
}

export async function getReferenceData() {
  const [categories, codesBudgetaires, params] = await Promise.all([
    prisma.categorie.findMany({
      orderBy: [{ sens: "asc" }, { nom: "asc" }],
    }),
    prisma.codeBudgetaire.findMany({ orderBy: { code: "asc" } }),
    prisma.parametre.findFirst(),
  ]);

  return {
    categories,
    codesBudgetaires,
    params,
  };
}

export async function getJournalOperations(): Promise<OperationRow[]> {
  const ops = await prisma.operation.findMany({
    include: { categorie: true, codeBudgetaire: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return ops.map((op) => serializeOp(op));
}

export async function getCaisseOperations(
  soldeInitial: number
): Promise<OperationRow[]> {
  const ops = await prisma.operationCaisse.findMany({
    include: { categorie: true, codeBudgetaire: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  let solde = soldeInitial;
  return ops.map((op) => {
    const approved = (op.statutApprobation ?? "APPROUVE") === "APPROUVE";
    if (approved) {
      solde += (op.entree ?? 0) - (op.sortie ?? 0);
      return serializeOp(op, solde);
    }
    return serializeOp(op, undefined);
  });
}
