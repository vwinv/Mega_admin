export const REFERENTIEL_IMPOTS = [
  {
    code: "TVA",
    libelle: "TVA (Taxe sur la Valeur Ajoutée)",
    taux: "18 %",
    periodicite: "Mensuelle",
    description: "Déclaration et paiement de la TVA collectée nette.",
  },
  {
    code: "RET-SAL",
    libelle: "Retenues à la source sur salaires",
    taux: "Variable",
    periodicite: "Mensuelle",
    description: "Retenues IR sur traitements et salaires.",
  },
  {
    code: "CFCE",
    libelle: "CFCE (Contribution Fonds Chômage)",
    taux: "3 %",
    periodicite: "Trimestrielle",
    description: "Contribution au fonds national de l'emploi.",
  },
  {
    code: "IS",
    libelle: "IS (Impôt sur les Sociétés)",
    taux: "30 %",
    periodicite: "Annuelle",
    description: "Acomptes trimestriels + solde annuel.",
  },
  {
    code: "IMF",
    libelle: "IMF (Impôt Minimum Forfaitaire)",
    taux: "0,5 % du CA",
    periodicite: "Annuelle",
    description: "Minimum d'impôt même en cas de déficit.",
  },
  {
    code: "CEL",
    libelle: "Patente / CEL (Contribution Économique Locale)",
    taux: "Variable",
    periodicite: "Annuelle",
    description: "Taxe locale sur l'activité économique.",
  },
  {
    code: "IPRES",
    libelle: "IPRES (retraite)",
    taux: "8 % salarié + 12 % employeur",
    periodicite: "Mensuelle",
    description: "Cotisations retraite obligatoires.",
  },
  {
    code: "CSS",
    libelle: "CSS (Couverture Sociale Universelle)",
    taux: "Variable",
    periodicite: "Mensuelle",
    description: "Cotisation couverture maladie universelle.",
  },
] as const;

export type EcheanceRow = {
  id: string;
  echeance: string;
  impot: string;
  periode: string;
  montantDu: number;
  datePaiement: string | null;
  statut: string;
  resteAPayer: number;
};

export function computeTvaDue(
  collectee: number,
  deductible: number,
  creditReporte: number
): number {
  return Math.max(0, collectee - deductible - creditReporte);
}

/** Facture ou écriture journal liée à une déclaration TVA mensuelle. */
export type TvaSourceRef = {
  id: string;
  source: "FACTURE" | "JOURNAL";
  reference: string;
  label: string;
  date: string;
  statut: string;
  totalHT: number;
  tva: number;
  totalTTC: number;
  tauxTVA: number;
  href: string;
  sens: "collectee" | "deductible";
};

/** @deprecated alias — préférer TvaSourceRef */
export type TvaFactureRef = TvaSourceRef;

export type TvaMensuelle = {
  mois: number;
  label: string;
  /** Montant saisi / déclaré (peut être synchronisé depuis les sources) */
  collectee: number;
  deductible: number;
  creditReporte: number;
  tvaDue: number;
  /** Somme TVA collectée auto (factures + entrées journal avec TVA) */
  tvaFacturee: number;
  /** Somme TVA déductible auto (sorties journal avec TVA) */
  tvaDeductibleAuto: number;
  /** Références (factures + journal) */
  factures: TvaSourceRef[];
};
