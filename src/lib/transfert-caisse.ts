import {
  APPROVISIONNEMENT_CAISSE,
  TRANSFERT_VERS_CAISSE,
} from "@/lib/constants";
import { nextNumeroPieceCaisse } from "@/lib/numero-piece";
import { prisma } from "@/lib/prisma";

/**
 * Crée l'entrée caisse miroir d'un transfert banque → petite caisse.
 * Idempotent : ne recrée pas si un approvisionnement similaire existe déjà.
 */
export async function ensureApprovisionnementCaisse(params: {
  montant: number;
  date: Date | null;
  codeBudgetaireId?: string | null;
  libelleJournal?: string | null;
}): Promise<boolean> {
  const { montant, date, codeBudgetaireId, libelleJournal } = params;
  if (montant <= 0) return false;

  const catAppro = await prisma.categorie.findFirst({
    where: { nom: APPROVISIONNEMENT_CAISSE },
  });
  if (!catAppro) return false;

  // Évite les doublons (ex. double approbation / re-sync)
  const existing = await prisma.operationCaisse.findFirst({
    where: {
      categorieId: catAppro.id,
      entree: montant,
      statutApprobation: "APPROUVE",
      ...(date
        ? { date }
        : { date: null }),
    },
  });
  if (existing) return false;

  await prisma.operationCaisse.create({
    data: {
      date,
      numeroPiece: await nextNumeroPieceCaisse(prisma, date),
      libelle: libelleJournal?.trim()
        ? `Approvisionnement · ${libelleJournal.trim()}`
        : "Approvisionnement petite caisse",
      categorieId: catAppro.id,
      codeBudgetaireId: codeBudgetaireId || null,
      entree: montant,
      sortie: null,
      statutApprobation: "APPROUVE",
    },
  });
  return true;
}

export async function isTransfertVersCaisse(categorieId: string): Promise<boolean> {
  const cat = await prisma.categorie.findUnique({ where: { id: categorieId } });
  return cat?.nom === TRANSFERT_VERS_CAISSE;
}
