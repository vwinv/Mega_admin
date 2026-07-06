import { MOIS_LABELS } from "@/lib/constants";
import type { ChecklistCell, LigneRapprochement } from "@/lib/rapprochement-types";
import { prisma } from "@/lib/prisma";
import { getTresorerieMensuelle } from "@/lib/tresorerie";

export type { ChecklistCell, LigneRapprochement };

export async function getRapprochements(
  annee: number
): Promise<LigneRapprochement[]> {
  const [treso, releves] = await Promise.all([
    getTresorerieMensuelle(),
    prisma.rapprochementBancaire.findMany({ where: { annee } }),
  ]);

  if (!treso) return [];

  const releveMap = new Map(releves.map((r) => [r.mois, r.soldeReleve]));

  return treso.banque.map((b) => {
    const soldeReleve = releveMap.get(b.mois) ?? null;
    return {
      mois: b.mois,
      label: b.label,
      soldeCalcule: b.fin,
      soldeReleve,
      ecart: soldeReleve !== null ? soldeReleve - b.fin : null,
    };
  });
}

export async function getChecklist(annee: number): Promise<ChecklistCell[]> {
  const items = await prisma.checklistItem.findMany({ where: { annee } });
  return items.map((i) => ({
    mois: i.mois,
    tacheId: i.tacheId,
    statut: i.statut,
  }));
}

export { MOIS_LABELS };
