"use server";

import { revalidatePath } from "next/cache";
import { guardManageParametres, isGuardError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parseMontant } from "@/lib/validation";

const PATHS = [
  "/",
  "/journal",
  "/caisse",
  "/tresorerie",
  "/budget",
  "/codes-budgetaires",
  "/plan-comptable",
  "/synthese",
  "/impots",
  "/controle",
  "/import",
  "/parametres",
];

function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export type ParametresForm = {
  entreprise: string;
  devise: string;
  annee: string;
  soldeInitialBanque: string;
  soldeInitialCaisse: string;
  plafondCaisse: string;
  seuilDoubleValidation: string;
  tauxTVA: string;
};

export async function updateParametres(
  form: ParametresForm
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageParametres();
  if (isGuardError(guard)) return guard;

  if (!form.entreprise.trim()) {
    return { ok: false, error: "Le nom de l'entreprise est obligatoire." };
  }

  const annee = parseInt(form.annee, 10);
  if (Number.isNaN(annee) || annee < 2000 || annee > 2100) {
    return { ok: false, error: "Année exercice invalide." };
  }

  const tauxStr = form.tauxTVA.replace(",", ".").replace("%", "").trim();
  const tauxTVA = parseFloat(tauxStr);
  if (Number.isNaN(tauxTVA) || tauxTVA < 0 || tauxTVA > 100) {
    return { ok: false, error: "Taux TVA invalide (ex. 18 ou 0.18)." };
  }
  const tauxNormalise = tauxTVA > 1 ? tauxTVA / 100 : tauxTVA;

  await prisma.parametre.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      entreprise: form.entreprise.trim(),
      devise: form.devise.trim() || "FCFA",
      annee,
      soldeInitialBanque: parseMontant(form.soldeInitialBanque),
      soldeInitialCaisse: parseMontant(form.soldeInitialCaisse),
      plafondCaisse: parseMontant(form.plafondCaisse) || 300000,
      seuilDoubleValidation: parseMontant(form.seuilDoubleValidation) || 500000,
      tauxTVA: tauxNormalise,
    },
    update: {
      entreprise: form.entreprise.trim(),
      devise: form.devise.trim() || "FCFA",
      annee,
      soldeInitialBanque: parseMontant(form.soldeInitialBanque),
      soldeInitialCaisse: parseMontant(form.soldeInitialCaisse),
      plafondCaisse: parseMontant(form.plafondCaisse) || 300000,
      seuilDoubleValidation: parseMontant(form.seuilDoubleValidation) || 500000,
      tauxTVA: tauxNormalise,
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "Parametre",
    entityId: "1",
    details: form.entreprise.trim(),
  });

  revalidateAll();
  return { ok: true };
}
