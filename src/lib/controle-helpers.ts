export const CHECKLIST_TACHES = [
  { id: 1, libelle: "Rapprochement bancaire du mois" },
  { id: 2, libelle: "Rapprochement petite caisse" },
  { id: 3, libelle: "Saisie complète des opérations" },
  { id: 4, libelle: "Vérification des n° de pièce" },
  { id: 5, libelle: "Déclaration et paiement TVA" },
  { id: 6, libelle: "Paiement des salaires" },
  { id: 7, libelle: "Cotisations IPRES / CSS" },
  { id: 8, libelle: "Suivi des enveloppes budgétaires" },
  { id: 9, libelle: "Contrôle des doublons" },
  { id: 10, libelle: "Archivage des pièces justificatives" },
  { id: 11, libelle: "Revue du tableau de bord" },
] as const;

export type Controle = {
  id: number;
  libelle: string;
  statut: "OK" | "ALERTE";
  detail: string;
};

export const RECOMMANDATIONS: Record<number, string> = {
  1: "Compléter les dates manquantes sur toutes les opérations.",
  2: "Vérifier que chaque opération est classée dans une catégorie SYSCOHADA.",
  3: "Attribuer un numéro de pièce à chaque écriture.",
  4: "Associer un code budgétaire à chaque sortie (hors transferts internes).",
  5: "Corriger les lignes ayant à la fois une entrée et une sortie.",
  6: "Vérifier les écritures en double (même date, libellé et montant).",
  7: "Arrêter les sorties ou approvisionner la caisse.",
  8: "Réduire les dépenses ou augmenter les encaissements bancaires.",
  9: "Créer les écritures manquantes de transfert banque → caisse.",
  10: "Réduire les dépenses ou augmenter les enveloppes.",
  11: "Réviser le budget prévisionnel ou maîtriser les dépenses.",
  12: "Virer l'excédent de caisse vers la banque.",
  13: "Régulariser les impôts en retard dans le module Impôts & taxes.",
};
