"use server";

import { revalidatePath } from "next/cache";
import {
  APPROVISIONNEMENT_CAISSE,
  TRANSFERT_VERS_CAISSE,
} from "@/lib/constants";
import {
  approvalFieldsForCreate,
  approvalFieldsForUpdate,
  needsCeoApproval,
} from "@/lib/approbation";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { OperationInput, montantOperationInchange, validateOperation } from "@/lib/validation";

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function toDbFields(input: OperationInput) {
  return {
    date: parseDate(input.date),
    numeroPiece: input.numeroPiece.trim() || null,
    libelle: input.libelle.trim(),
    categorieId: input.categorieId,
    codeBudgetaireId: input.codeBudgetaireId || null,
    modePaiement: input.modePaiement || null,
    entree: input.montantType === "entree" ? input.montant : null,
    sortie: input.montantType === "sortie" ? input.montant : null,
    observations: input.observations.trim() || null,
    validePar: input.validePar.trim() || null,
  };
}

async function createTransfertCaisse(
  montant: number,
  date: Date | null,
  codeBudgetaireId: string | null
) {
  const catAppro = await prisma.categorie.findFirst({
    where: { nom: APPROVISIONNEMENT_CAISSE },
  });
  if (!catAppro) return;

  await prisma.operationCaisse.create({
    data: {
      date,
      libelle: "Approvisionnement petite caisse",
      categorieId: catAppro.id,
      codeBudgetaireId,
      entree: montant,
      sortie: null,
      statutApprobation: "APPROUVE",
    },
  });
}

type OpResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function createOperation(input: OperationInput): Promise<OpResult> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const params = await prisma.parametre.findFirst();
  if (!params) return { ok: false, error: "Paramètres non configurés." };

  const categorie = await prisma.categorie.findUnique({
    where: { id: input.categorieId },
  });
  if (!categorie) return { ok: false, error: "Catégorie introuvable." };

  const ceoPending = needsCeoApproval(input.montant, params.seuilDoubleValidation);
  const enriched = { ...input, categorieNom: categorie.nom, validePar: "" };
  const err = validateOperation(enriched, params.seuilDoubleValidation, {
    requireMode: false,
    ceoApprovalPending: ceoPending,
  });
  if (err) return { ok: false, error: err };

  const approval = approvalFieldsForCreate(
    input.montant,
    params.seuilDoubleValidation,
    guard.nom
  );
  const created = await prisma.operation.create({
    data: { ...toDbFields(enriched), ...approval },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Operation",
    entityId: created.id,
    details: ceoPending
      ? `${enriched.libelle} · ${enriched.montant.toLocaleString("fr-FR")} FCFA · En attente CEO`
      : `${enriched.libelle} · ${enriched.montant.toLocaleString("fr-FR")} FCFA`,
  });

  if (
    categorie.nom === TRANSFERT_VERS_CAISSE &&
    input.montantType === "sortie" &&
    !ceoPending
  ) {
    await createTransfertCaisse(
      input.montant,
      parseDate(input.date),
      input.codeBudgetaireId || null
    );
  }

  revalidatePath("/journal");
  revalidatePath("/caisse");
  revalidatePath("/");
  revalidatePath("/tresorerie");
  revalidatePath("/budget");
  revalidatePath("/codes-budgetaires");
  revalidatePath("/approbations");

  return ceoPending
    ? {
        ok: true,
        message:
          "Opération enregistrée. Elle est en attente d'approbation par la CEO avant d'être comptabilisée.",
      }
    : { ok: true };
}

export async function updateOperation(
  id: string,
  input: OperationInput
): Promise<OpResult> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const params = await prisma.parametre.findFirst();
  if (!params) return { ok: false, error: "Paramètres non configurés." };

  const categorie = await prisma.categorie.findUnique({
    where: { id: input.categorieId },
  });
  if (!categorie) return { ok: false, error: "Catégorie introuvable." };

  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Opération introuvable." };

  const montantInchange = montantOperationInchange(existing, input);
  const ceoPending =
    needsCeoApproval(input.montant, params.seuilDoubleValidation) &&
    !montantInchange;

  const enriched = { ...input, categorieNom: categorie.nom, validePar: "" };
  const err = validateOperation(enriched, params.seuilDoubleValidation, {
    skipValidePar: montantInchange && existing.statutApprobation === "APPROUVE",
    ceoApprovalPending: ceoPending,
  });
  if (err) return { ok: false, error: err };

  const approvalUpdate = approvalFieldsForUpdate(
    input.montant,
    params.seuilDoubleValidation,
    existing,
    input,
    guard.nom,
    montantInchange
  );

  await prisma.operation.update({
    where: { id },
    data: { ...toDbFields(enriched), ...approvalUpdate },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "Operation",
    entityId: id,
    details: `${enriched.libelle} · ${enriched.montant.toLocaleString("fr-FR")} FCFA`,
  });

  revalidatePath("/journal");
  revalidatePath("/");
  revalidatePath("/tresorerie");
  revalidatePath("/budget");
  revalidatePath("/codes-budgetaires");
  revalidatePath("/approbations");

  return ceoPending
    ? {
        ok: true,
        message: "Modification enregistrée. Nouvelle approbation CEO requise.",
      }
    : { ok: true };
}

export async function deleteOperation(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Opération introuvable." };

  await prisma.operation.delete({ where: { id } });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "Operation",
    entityId: id,
    details: existing.libelle,
  });
  revalidatePath("/journal");
  revalidatePath("/");
  revalidatePath("/tresorerie");
  revalidatePath("/budget");
  revalidatePath("/codes-budgetaires");
  revalidatePath("/approbations");
  return { ok: true };
}
