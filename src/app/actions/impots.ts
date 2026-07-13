"use server";

import { revalidatePath } from "next/cache";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseMontant } from "@/lib/validation";

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createEcheance(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const echeance = formData.get("echeance") as string;
  const impot = formData.get("impot") as string;
  const periode = formData.get("periode") as string;
  const montantDu = parseMontant(formData.get("montantDu") as string);
  const statut = (formData.get("statut") as string) || "En attente";

  if (!echeance || !impot.trim() || !periode.trim()) {
    return { ok: false, error: "Échéance, impôt et période sont obligatoires." };
  }

  await prisma.echeanceImpot.create({
    data: {
      echeance: parseDate(echeance),
      impot: impot.trim(),
      periode: periode.trim(),
      montantDu,
      statut,
      datePaiement: statut === "Payé" ? new Date() : null,
    },
  });

  revalidatePath("/impots");
  revalidatePath("/controle");
  revalidatePath("/");
  return { ok: true };
}

export async function updateEcheanceStatut(
  id: string,
  statut: string,
  datePaiement?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  await prisma.echeanceImpot.update({
    where: { id },
    data: {
      statut,
      datePaiement:
        statut === "Payé"
          ? datePaiement
            ? parseDate(datePaiement)
            : new Date()
          : null,
    },
  });

  revalidatePath("/impots");
  revalidatePath("/controle");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteEcheance(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  await prisma.echeanceImpot.delete({ where: { id } });
  revalidatePath("/impots");
  revalidatePath("/controle");
  return { ok: true };
}

export async function saveTvaDeclaration(
  annee: number,
  mois: number,
  collectee: string,
  deductible: string,
  creditReporte: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  if (mois < 1 || mois > 12) return { ok: false, error: "Mois invalide." };

  await prisma.tvaDeclaration.upsert({
    where: { annee_mois: { annee, mois } },
    create: {
      annee,
      mois,
      collectee: parseMontant(collectee),
      deductible: parseMontant(deductible),
      creditReporte: parseMontant(creditReporte),
    },
    update: {
      collectee: parseMontant(collectee),
      deductible: parseMontant(deductible),
      creditReporte: parseMontant(creditReporte),
    },
  });

  revalidatePath("/impots");
  return { ok: true };
}
