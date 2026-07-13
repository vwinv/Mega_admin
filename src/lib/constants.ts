export const MODES_PAIEMENT = [
  "Virement",
  "Chèque",
  "Carte bancaire",
  "Mobile Money",
  "Cash",
] as const;

export const STATUTS_ECHEANCE = [
  "Payé",
  "En attente",
  "En retard",
] as const;

export const MOIS_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export const TRANSFERT_VERS_CAISSE = "Transfert vers petite caisse";
export const APPROVISIONNEMENT_CAISSE =
  "Approvisionnement de caisse (depuis banque)";

export const CODE_COMPTE_INTERNE = "585";

export function isMouvementInterne(categorieNom: string, codeCompte: string) {
  return (
    codeCompte === CODE_COMPTE_INTERNE ||
    categorieNom === TRANSFERT_VERS_CAISSE ||
    categorieNom === APPROVISIONNEMENT_CAISSE
  );
}
