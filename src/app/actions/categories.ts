"use server";

import { revalidatePath } from "next/cache";
import { guardManageCategories, isGuardError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const PATHS = [
  "/",
  "/journal",
  "/caisse",
  "/tresorerie",
  "/budget",
  "/codes-budgetaires",
  "/plan-comptable",
  "/synthese",
  "/parametres",
  "/import",
];

function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export async function createCategorie(
  nom: string,
  sens: string,
  codeCompte: string,
  intituleCompte: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageCategories();
  if (isGuardError(guard)) return guard;

  const name = nom.trim();
  const code = codeCompte.trim();
  const intitule = intituleCompte.trim();

  if (!name) return { ok: false, error: "Le nom de la catégorie est obligatoire." };
  if (!code) return { ok: false, error: "Le code compte est obligatoire." };
  if (!intitule) return { ok: false, error: "L'intitulé est obligatoire." };
  if (sens !== "entree" && sens !== "sortie") {
    return { ok: false, error: "Le sens doit être entrée ou sortie." };
  }

  const exists = await prisma.categorie.findUnique({ where: { nom: name } });
  if (exists) return { ok: false, error: "Cette catégorie existe déjà." };

  await prisma.categorie.create({
    data: { nom: name, sens, codeCompte: code, intituleCompte: intitule },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Categorie",
    details: name,
  });

  revalidateAll();
  return { ok: true };
}

export async function updateCategorie(
  id: string,
  nom: string,
  codeCompte: string,
  intituleCompte: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageCategories();
  if (isGuardError(guard)) return guard;

  const name = nom.trim();
  const code = codeCompte.trim();
  const intitule = intituleCompte.trim();

  if (!name) return { ok: false, error: "Le nom de la catégorie est obligatoire." };
  if (!code) return { ok: false, error: "Le code compte est obligatoire." };
  if (!intitule) return { ok: false, error: "L'intitulé est obligatoire." };

  const current = await prisma.categorie.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "Catégorie introuvable." };

  if (name !== current.nom) {
    const duplicate = await prisma.categorie.findUnique({ where: { nom: name } });
    if (duplicate) return { ok: false, error: "Ce nom de catégorie est déjà utilisé." };
  }

  await prisma.categorie.update({
    where: { id },
    data: { nom: name, codeCompte: code, intituleCompte: intitule },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "Categorie",
    entityId: id,
    details: name,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteCategorie(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageCategories();
  if (isGuardError(guard)) return guard;

  const used =
    (await prisma.operation.count({ where: { categorieId: id } })) +
    (await prisma.operationCaisse.count({ where: { categorieId: id } })) +
    (await prisma.budgetLigne.count({ where: { categorieId: id } }));

  if (used > 0) {
    return {
      ok: false,
      error: "Impossible de supprimer : cette catégorie est utilisée dans des opérations ou le budget.",
    };
  }

  await prisma.categorie.delete({ where: { id } });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "Categorie",
    entityId: id,
    details: "Suppression catégorie",
  });

  revalidateAll();
  return { ok: true };
}
