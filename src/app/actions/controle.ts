"use server";

import { revalidatePath } from "next/cache";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseMontant } from "@/lib/validation";

export async function saveRapprochement(
  annee: number,
  mois: number,
  soldeReleveStr: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const soldeReleve = parseMontant(soldeReleveStr);
  if (mois < 1 || mois > 12) return { ok: false, error: "Mois invalide." };

  await prisma.rapprochementBancaire.upsert({
    where: { annee_mois: { annee, mois } },
    create: { annee, mois, soldeReleve },
    update: { soldeReleve },
  });

  revalidatePath("/controle");
  return { ok: true };
}

export async function saveChecklistItem(
  annee: number,
  mois: number,
  tacheId: number,
  statut: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  if (!["Fait", "À faire", "N/A"].includes(statut)) {
    return { ok: false, error: "Statut invalide." };
  }

  await prisma.checklistItem.upsert({
    where: { annee_mois_tacheId: { annee, mois, tacheId } },
    create: { annee, mois, tacheId, statut },
    update: { statut },
  });

  revalidatePath("/controle");
  return { ok: true };
}
