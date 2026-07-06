import { MOIS_LABELS } from "@/lib/constants";
import type { EcheanceRow, TvaMensuelle } from "@/lib/impots-types";
import { computeTvaDue } from "@/lib/impots-types";
import { resolveStatutEcheance } from "@/lib/impots-statut";
import { prisma } from "@/lib/prisma";

export type { EcheanceRow, TvaMensuelle };
export { REFERENTIEL_IMPOTS, computeTvaDue } from "@/lib/impots-types";

export async function getEcheances(): Promise<EcheanceRow[]> {
  const rows = await prisma.echeanceImpot.findMany({
    orderBy: { echeance: "asc" },
  });

  return rows.map((e) => {
    const statut = resolveStatutEcheance(e.statut, e.echeance);
    const paye = statut === "Payé";
    const reste = paye ? 0 : e.montantDu;
    return {
      id: e.id,
      echeance: e.echeance.toISOString(),
      impot: e.impot,
      periode: e.periode,
      montantDu: e.montantDu,
      datePaiement: e.datePaiement?.toISOString() ?? null,
      statut,
      resteAPayer: reste,
    };
  });
}

/** Met à jour en base les échéances dont la date est dépassée (hors « Payé »). */
export async function syncEcheancesEnRetard(): Promise<number> {
  const now = new Date();
  const rows = await prisma.echeanceImpot.findMany({
    where: { statut: { not: "Payé" } },
  });

  let updated = 0;
  for (const e of rows) {
    const effectif = resolveStatutEcheance(e.statut, e.echeance, now);
    if (effectif !== e.statut) {
      await prisma.echeanceImpot.update({
        where: { id: e.id },
        data: { statut: effectif },
      });
      updated++;
    }
  }
  return updated;
}

export async function getTvaMensuelle(annee: number): Promise<TvaMensuelle[]> {
  const declarations = await prisma.tvaDeclaration.findMany({
    where: { annee },
  });
  const byMois = new Map(declarations.map((d) => [d.mois, d]));

  return MOIS_LABELS.map((label, idx) => {
    const mois = idx + 1;
    const decl = byMois.get(mois);
    const collectee = decl?.collectee ?? 0;
    const deductible = decl?.deductible ?? 0;
    const creditReporte = decl?.creditReporte ?? 0;
    return {
      mois,
      label,
      collectee,
      deductible,
      creditReporte,
      tvaDue: computeTvaDue(collectee, deductible, creditReporte),
    };
  });
}
