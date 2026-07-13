import { readFileSync } from "fs";
import { join } from "path";
import { prisma as defaultPrisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ImportResult, MegaData } from "@/lib/import-types";

export function parseDate(value: string | null | undefined): Date | null {
  if (!value || !String(value).trim()) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  }
  const fr = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (fr) {
    const [, d, m, y] = fr;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function loadDefaultMegaData(): MegaData {
  const dataPath = join(process.cwd(), "donnees", "mega_data.json");
  return JSON.parse(readFileSync(dataPath, "utf-8")) as MegaData;
}

export async function importMegaData(
  data: MegaData,
  options: { replace: boolean } = { replace: true },
  db: PrismaClient = defaultPrisma
): Promise<ImportResult> {
  const warnings: string[] = [];

  if (options.replace) {
    await db.checklistItem.deleteMany();
    await db.rapprochementBancaire.deleteMany();
    await db.budgetLigne.deleteMany();
    await db.echeanceImpot.deleteMany();
    await db.tvaDeclaration.deleteMany();
    await db.operationCaisse.deleteMany();
    await db.operation.deleteMany();
    await db.codeBudgetaire.deleteMany();
    await db.categorie.deleteMany();
    await db.parametre.deleteMany();
  }

  const existingParams = await db.parametre.findFirst();

  if (options.replace || !existingParams) {
    await db.parametre.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        entreprise: data.entreprise,
        devise: data.devise,
        annee: data.annee,
        soldeInitialBanque: data.soldes_initiaux.banque,
        soldeInitialCaisse: data.soldes_initiaux.caisse,
      },
      update: {
        entreprise: data.entreprise,
        devise: data.devise,
        annee: data.annee,
        soldeInitialBanque: data.soldes_initiaux.banque,
        soldeInitialCaisse: data.soldes_initiaux.caisse,
      },
    });
  }

  const categorieMap = new Map<string, string>();

  for (const cat of data.plan_comptable) {
    const existing = await db.categorie.findUnique({
      where: { nom: cat.categorie },
    });
    if (existing) {
      categorieMap.set(cat.categorie, existing.id);
      if (options.replace) {
        await db.categorie.update({
          where: { id: existing.id },
          data: {
            sens: cat.sens,
            codeCompte: cat.code,
            intituleCompte: cat.intitule,
          },
        });
      }
    } else {
      const created = await db.categorie.create({
        data: {
          nom: cat.categorie,
          sens: cat.sens,
          codeCompte: cat.code,
          intituleCompte: cat.intitule,
        },
      });
      categorieMap.set(cat.categorie, created.id);
    }
  }

  const codeBudgetMap = new Map<string, string>();

  for (const code of data.codes_budgetaires) {
    const existing = await db.codeBudgetaire.findUnique({
      where: { code: code.code },
    });
    if (existing) {
      codeBudgetMap.set(code.code, existing.id);
      await db.codeBudgetaire.update({
        where: { id: existing.id },
        data: {
          beneficiaire: code.beneficiaire,
          enveloppe: code.enveloppe,
        },
      });
    } else {
      const created = await db.codeBudgetaire.create({
        data: {
          code: code.code,
          beneficiaire: code.beneficiaire,
          enveloppe: code.enveloppe,
        },
      });
      codeBudgetMap.set(code.code, created.id);
    }
  }

  if (options.replace) {
    await db.operation.deleteMany();
    await db.operationCaisse.deleteMany();
  }

  let journalCount = 0;
  for (const op of data.journal) {
    const categorieId = categorieMap.get(op.categorie);
    if (!categorieId) {
      warnings.push(`Journal ignoré : catégorie inconnue « ${op.categorie} » (${op.libelle})`);
      continue;
    }
    await db.operation.create({
      data: {
        date: parseDate(op.date),
        numeroPiece: op.piece,
        libelle: op.libelle,
        categorieId,
        codeBudgetaireId: op.code_budgetaire
          ? codeBudgetMap.get(op.code_budgetaire) ?? null
          : null,
        modePaiement: op.mode,
        entree: op.entree,
        sortie: op.sortie,
        observations: op.observations,
      },
    });
    journalCount++;
  }

  let caisseCount = 0;
  for (const op of data.petite_caisse) {
    const categorieId = categorieMap.get(op.categorie);
    if (!categorieId) {
      warnings.push(`Caisse ignorée : catégorie inconnue « ${op.categorie} » (${op.motif})`);
      continue;
    }
    await db.operationCaisse.create({
      data: {
        date: parseDate(op.date),
        numeroPiece: op.piece,
        libelle: op.motif,
        categorieId,
        codeBudgetaireId: op.code_budgetaire
          ? codeBudgetMap.get(op.code_budgetaire) ?? null
          : null,
        entree: op.entree,
        sortie: op.sortie,
      },
    });
    caisseCount++;
  }

  let budgetCount = 0;
  if (data.budget_previsionnel?.length) {
    for (const ligne of data.budget_previsionnel) {
      const categorieId = categorieMap.get(ligne.categorie);
      if (!categorieId) {
        warnings.push(
          `Budget ignoré : catégorie inconnue « ${ligne.categorie} » (mois ${ligne.mois})`
        );
        continue;
      }
      if (ligne.mois < 1 || ligne.mois > 12) continue;
      await db.budgetLigne.upsert({
        where: { categorieId_mois: { categorieId, mois: ligne.mois } },
        create: { categorieId, mois: ligne.mois, montant: ligne.montant },
        update: { montant: ligne.montant },
      });
      budgetCount++;
    }
  }

  return {
    categories: await db.categorie.count(),
    codesBudgetaires: await db.codeBudgetaire.count(),
    journal: journalCount,
    caisse: caisseCount,
    budgetLignes: budgetCount,
    warnings,
  };
}
