export const STATUTS_APPROBATION = [
  "APPROUVE",
  "EN_ATTENTE_CEO",
  "REFUSE",
] as const;

export type StatutApprobation = (typeof STATUTS_APPROBATION)[number];

export const STATUT_APPROBATION_LABELS: Record<StatutApprobation, string> = {
  APPROUVE: "Approuvé",
  EN_ATTENTE_CEO: "En attente CEO",
  REFUSE: "Refusé",
};

/** Opérations comptabilisées (trésorerie, budget, synthèse). */
export const whereOperationApprouvee = {
  statutApprobation: "APPROUVE" as const,
};

export function needsCeoApproval(montant: number, seuil: number): boolean {
  return montant >= seuil && montant > 0;
}

export function approvalFieldsForCreate(
  montant: number,
  seuil: number,
  demandePar: string
) {
  if (!needsCeoApproval(montant, seuil)) {
    return {
      statutApprobation: "APPROUVE" as const,
      demandePar: null,
      demandeAt: null,
      approuvePar: null,
      approuveAt: null,
      motifRefus: null,
      validePar: null,
    };
  }
  return {
    statutApprobation: "EN_ATTENTE_CEO" as const,
    demandePar,
    demandeAt: new Date(),
    approuvePar: null,
    approuveAt: null,
    motifRefus: null,
    validePar: null,
  };
}

export function approvalFieldsForUpdate(
  montant: number,
  seuil: number,
  existing: {
    statutApprobation: string;
    entree: number | null;
    sortie: number | null;
  },
  input: { montant: number; montantType: "entree" | "sortie" },
  demandePar: string,
  montantInchange: boolean
) {
  if (montantInchange && existing.statutApprobation === "APPROUVE") {
    return {};
  }

  if (!needsCeoApproval(montant, seuil)) {
    return {
      statutApprobation: "APPROUVE" as const,
      demandePar: null,
      demandeAt: null,
      approuvePar: null,
      approuveAt: null,
      motifRefus: null,
      validePar: null,
    };
  }

  return {
    statutApprobation: "EN_ATTENTE_CEO" as const,
    demandePar,
    demandeAt: new Date(),
    approuvePar: null,
    approuveAt: null,
    motifRefus: null,
    validePar: null,
  };
}
