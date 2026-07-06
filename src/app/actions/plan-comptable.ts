"use server";

import { updateCategorie } from "@/app/actions/categories";
import { prisma } from "@/lib/prisma";

export async function updateCategorieCompte(
  id: string,
  codeCompte: string,
  intituleCompte: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cat = await prisma.categorie.findUnique({ where: { id } });
  if (!cat) return { ok: false, error: "Catégorie introuvable." };

  return updateCategorie(id, cat.nom, codeCompte, intituleCompte);
}
