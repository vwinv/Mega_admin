import {
  APPROVISIONNEMENT_CAISSE,
  CODE_COMPTE_INTERNE,
  INTITULE_COMPTE_INTERNE,
  REMISE_EN_BANQUE,
  TRANSFERT_VERS_BANQUE,
  TRANSFERT_VERS_CAISSE,
} from "@/lib/constants";
import {
  nextNumeroPieceBanque,
  nextNumeroPieceCaisse,
} from "@/lib/numero-piece";
import { prisma } from "@/lib/prisma";

const CATEGORIES_TRANSFERT = [
  {
    nom: TRANSFERT_VERS_CAISSE,
    sens: "sortie",
  },
  {
    nom: APPROVISIONNEMENT_CAISSE,
    sens: "entree",
  },
  {
    nom: TRANSFERT_VERS_BANQUE,
    sens: "sortie",
  },
  {
    nom: REMISE_EN_BANQUE,
    sens: "entree",
  },
] as const;

/** Crée les catégories de virement interne si elles manquent. */
export async function ensureTransfertCategories(): Promise<void> {
  for (const cat of CATEGORIES_TRANSFERT) {
    await prisma.categorie.upsert({
      where: { nom: cat.nom },
      create: {
        nom: cat.nom,
        sens: cat.sens,
        codeCompte: CODE_COMPTE_INTERNE,
        intituleCompte: INTITULE_COMPTE_INTERNE,
      },
      update: {},
    });
  }
}

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

  await ensureTransfertCategories();
  const catAppro = await prisma.categorie.findUnique({
    where: { nom: APPROVISIONNEMENT_CAISSE },
  });
  if (!catAppro) return false;

  const existing = await prisma.operationCaisse.findFirst({
    where: {
      categorieId: catAppro.id,
      entree: montant,
      statutApprobation: "APPROUVE",
      ...(date ? { date } : { date: null }),
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

/**
 * Crée l'entrée journal miroir d'un transfert petite caisse → banque.
 * Idempotent : ne recrée pas si une remise similaire existe déjà.
 */
export async function ensureRemiseEnBanque(params: {
  montant: number;
  date: Date | null;
  codeBudgetaireId?: string | null;
  libelleCaisse?: string | null;
}): Promise<boolean> {
  const { montant, date, codeBudgetaireId, libelleCaisse } = params;
  if (montant <= 0) return false;

  await ensureTransfertCategories();
  const catRemise = await prisma.categorie.findUnique({
    where: { nom: REMISE_EN_BANQUE },
  });
  if (!catRemise) return false;

  const existing = await prisma.operation.findFirst({
    where: {
      categorieId: catRemise.id,
      entree: montant,
      statutApprobation: "APPROUVE",
      ...(date ? { date } : { date: null }),
    },
  });
  if (existing) return false;

  await prisma.operation.create({
    data: {
      date,
      numeroPiece: await nextNumeroPieceBanque(prisma, date),
      libelle: libelleCaisse?.trim()
        ? `Remise en banque · ${libelleCaisse.trim()}`
        : "Remise en banque (depuis caisse)",
      categorieId: catRemise.id,
      codeBudgetaireId: codeBudgetaireId || null,
      modePaiement: "Cash",
      entree: montant,
      sortie: null,
      tauxTVA: 0,
      statutApprobation: "APPROUVE",
    },
  });
  return true;
}

export async function isTransfertVersCaisse(
  categorieId: string
): Promise<boolean> {
  const cat = await prisma.categorie.findUnique({ where: { id: categorieId } });
  return cat?.nom === TRANSFERT_VERS_CAISSE;
}

export async function isTransfertVersBanque(
  categorieId: string
): Promise<boolean> {
  const cat = await prisma.categorie.findUnique({ where: { id: categorieId } });
  return cat?.nom === TRANSFERT_VERS_BANQUE;
}

export async function deleteMatchingApprovisionnementCaisse(params: {
  montant: number;
  date: Date | null;
}): Promise<void> {
  const catAppro = await prisma.categorie.findUnique({
    where: { nom: APPROVISIONNEMENT_CAISSE },
  });
  if (!catAppro || params.montant <= 0) return;
  const existing = await prisma.operationCaisse.findFirst({
    where: {
      categorieId: catAppro.id,
      entree: params.montant,
      ...(params.date ? { date: params.date } : { date: null }),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.operationCaisse.delete({ where: { id: existing.id } });
  }
}

export async function deleteMatchingRemiseEnBanque(params: {
  montant: number;
  date: Date | null;
}): Promise<void> {
  const catRemise = await prisma.categorie.findUnique({
    where: { nom: REMISE_EN_BANQUE },
  });
  if (!catRemise || params.montant <= 0) return;
  const existing = await prisma.operation.findFirst({
    where: {
      categorieId: catRemise.id,
      entree: params.montant,
      ...(params.date ? { date: params.date } : { date: null }),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.operation.delete({ where: { id: existing.id } });
  }
}
