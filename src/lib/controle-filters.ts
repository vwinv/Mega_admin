import { TRANSFERT_VERS_CAISSE, APPROVISIONNEMENT_CAISSE, isMouvementInterne } from "@/lib/constants";
import type { OperationRow } from "@/lib/types";

export function matchesJournalControleFilter(
  op: OperationRow,
  filter: string
): boolean {
  switch (filter) {
    case "sans-date":
      return !op.date;
    case "sans-piece":
      return !op.numeroPiece?.trim();
    case "sans-code-budget":
      return (
        (op.sortie ?? 0) > 0 &&
        !op.codeBudgetaireId &&
        !isMouvementInterne(op.categorieNom, op.codeCompte)
      );
    case "double-montant":
      return (op.entree ?? 0) > 0 && (op.sortie ?? 0) > 0;
    case "transfert-caisse":
      return op.categorieNom === TRANSFERT_VERS_CAISSE;
    case "doublon":
      return true;
    default:
      return true;
  }
}

export function matchesCaisseControleFilter(
  op: OperationRow,
  filter: string
): boolean {
  switch (filter) {
    case "sans-date":
      return !op.date;
    case "sans-piece":
      return !op.numeroPiece?.trim();
    case "sans-code-budget":
      return (
        (op.sortie ?? 0) > 0 &&
        !op.codeBudgetaireId &&
        !isMouvementInterne(op.categorieNom, op.codeCompte)
      );
    case "double-montant":
      return (op.entree ?? 0) > 0 && (op.sortie ?? 0) > 0;
    case "appro-caisse":
      return op.categorieNom === APPROVISIONNEMENT_CAISSE;
    case "doublon":
      return true;
    default:
      return true;
  }
}

export function filterDoublons(ops: OperationRow[]): OperationRow[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const op of ops) {
    const montant = op.entree ?? op.sortie ?? 0;
    const key = `${op.date ?? "null"}|${op.libelle}|${montant}`;
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }
  return ops.filter((op) => {
    const montant = op.entree ?? op.sortie ?? 0;
    const key = `${op.date ?? "null"}|${op.libelle}|${montant}`;
    return duplicates.has(key);
  });
}
