import {
  APPROVISIONNEMENT_CAISSE,
  TRANSFERT_VERS_CAISSE,
} from "@/lib/constants";

export type OperationInput = {
  date: string;
  numeroPiece: string;
  libelle: string;
  categorieId: string;
  categorieNom?: string;
  codeBudgetaireId: string;
  modePaiement?: string;
  montantType: "entree" | "sortie";
  montant: number;
  observations: string;
  validePar: string;
};

export function parseMontant(value: string): number {
  const cleaned = value.replace(/\s/g, "").replace(/,/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function validateOperation(
  input: OperationInput,
  seuilDoubleValidation: number,
  options?: {
    requireMode?: boolean;
    checkCaisseBalance?: number;
    skipValidePar?: boolean;
    /** Opération soumise à approbation CEO (pas de « validé par » manuel). */
    ceoApprovalPending?: boolean;
  }
): string | null {
  if (!input.libelle.trim()) return "Le libellé est obligatoire.";
  if (!input.categorieId) return "La catégorie est obligatoire.";
  if (!input.montant || input.montant <= 0)
    return "Le montant doit être supérieur à 0.";

  if (
    !options?.skipValidePar &&
    !options?.ceoApprovalPending &&
    input.montant >= seuilDoubleValidation &&
    !input.validePar.trim()
  ) {
    return `Un paiement ≥ ${seuilDoubleValidation.toLocaleString("fr-FR")} FCFA nécessite l'approbation de la CEO.`;
  }

  if (options?.requireMode && !input.modePaiement) {
    return "Le mode de paiement est obligatoire.";
  }

  const isTransfertInterne =
    input.categorieNom === TRANSFERT_VERS_CAISSE ||
    input.categorieNom === APPROVISIONNEMENT_CAISSE;

  if (
    input.montantType === "sortie" &&
    !input.codeBudgetaireId &&
    !isTransfertInterne
  ) {
    return "Un code budgétaire est obligatoire pour les sorties.";
  }

  if (
    options?.checkCaisseBalance !== undefined &&
    input.montantType === "sortie" &&
    options.checkCaisseBalance - input.montant < 0
  ) {
    return "Solde de caisse insuffisant. Opération refusée.";
  }

  return null;
}

export function montantOperationInchange(
  existing: { entree: number | null; sortie: number | null },
  input: OperationInput
): boolean {
  const prevMontant = existing.entree ?? existing.sortie ?? 0;
  const prevType = existing.entree ? "entree" : "sortie";
  return (
    prevMontant === input.montant &&
    prevType === input.montantType &&
    input.montant > 0
  );
}
