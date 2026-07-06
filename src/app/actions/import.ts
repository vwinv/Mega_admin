"use server";

import { revalidatePath } from "next/cache";
import { guardImport, isGuardError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { importMegaData } from "@/lib/import-data";
import type { ImportResult } from "@/lib/import-types";

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
  "/parametres",
];

function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export async function importExcelFile(
  formData: FormData
): Promise<{ ok: true; result: ImportResult } | { ok: false; error: string }> {
  const guard = await guardImport();
  if (isGuardError(guard)) return guard;

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Aucun fichier sélectionné." };
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return { ok: false, error: "Format non supporté. Utilisez un fichier .xlsx ou .xls." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Fichier trop volumineux (max 10 Mo)." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = parseExcelBuffer(buffer);

    if (data.journal.length === 0 && data.petite_caisse.length === 0) {
      return {
        ok: false,
        error:
          "Aucune opération trouvée. Vérifiez que les feuilles « Journal » et « Petite caisse » existent.",
      };
    }

    const result = await importMegaData(data, { replace: true });
    await logAudit({
      userId: guard.id,
      userNom: guard.nom,
      action: "IMPORT",
      entity: "Import",
      details: `Journal ${result.journal} · Caisse ${result.caisse} · Catégories ${result.categories}`,
    });
    revalidateAll();
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return { ok: false, error: `Échec de l'import : ${msg}` };
  }
}
