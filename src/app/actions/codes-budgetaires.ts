"use server";

import { revalidatePath } from "next/cache";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseMontant } from "@/lib/validation";

export async function createCodeBudgetaire(
  code: string,
  beneficiaire: string,
  enveloppeStr: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const enveloppe = parseMontant(enveloppeStr);
  if (!code.trim()) return { ok: false, error: "Le code est obligatoire." };
  if (!beneficiaire.trim())
    return { ok: false, error: "Le bénéficiaire est obligatoire." };

  const exists = await prisma.codeBudgetaire.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (exists) return { ok: false, error: "Ce code existe déjà." };

  await prisma.codeBudgetaire.create({
    data: {
      code: code.trim().toUpperCase(),
      beneficiaire: beneficiaire.trim(),
      enveloppe,
    },
  });

  revalidatePath("/codes-budgetaires");
  revalidatePath("/journal");
  revalidatePath("/caisse");
  revalidatePath("/");
  return { ok: true };
}

export async function updateCodeBudgetaire(
  id: string,
  beneficiaire: string,
  enveloppeStr: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const enveloppe = parseMontant(enveloppeStr);
  if (!beneficiaire.trim())
    return { ok: false, error: "Le bénéficiaire est obligatoire." };

  await prisma.codeBudgetaire.update({
    where: { id },
    data: { beneficiaire: beneficiaire.trim(), enveloppe },
  });

  revalidatePath("/codes-budgetaires");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCodeBudgetaire(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const used =
    (await prisma.operation.count({ where: { codeBudgetaireId: id } })) +
    (await prisma.operationCaisse.count({ where: { codeBudgetaireId: id } }));
  if (used > 0) {
    return {
      ok: false,
      error: "Ce code est utilisé par des opérations et ne peut pas être supprimé.",
    };
  }

  await prisma.codeBudgetaire.delete({ where: { id } });
  revalidatePath("/codes-budgetaires");
  return { ok: true };
}
