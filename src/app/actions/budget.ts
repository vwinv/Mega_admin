"use server";

import { revalidatePath } from "next/cache";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseMontant } from "@/lib/validation";

export async function saveBudgetLigne(
  categorieId: string,
  mois: number,
  montantStr: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const montant = parseMontant(montantStr);
  if (mois < 1 || mois > 12) return { ok: false, error: "Mois invalide." };

  await prisma.budgetLigne.upsert({
    where: { categorieId_mois: { categorieId, mois } },
    create: { categorieId, mois, montant },
    update: { montant },
  });

  revalidatePath("/budget");
  revalidatePath("/");
  revalidatePath("/finance");
  return { ok: true };
}
