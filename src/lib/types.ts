export type CategorieOption = {
  id: string;
  nom: string;
  sens: string;
  codeCompte: string;
  intituleCompte: string;
};

export type CodeBudgetaireOption = {
  id: string;
  code: string;
  beneficiaire: string;
};

export type OperationRow = {
  id: string;
  date: string | null;
  numeroPiece: string | null;
  libelle: string;
  categorieId: string;
  categorieNom: string;
  codeCompte: string;
  codeBudgetaireId: string | null;
  codeBudgetaire: string | null;
  modePaiement: string | null;
  entree: number | null;
  sortie: number | null;
  /** 0 = hors TVA ; 0.18 = TVA 18 % */
  tauxTVA: number;
  observations: string | null;
  validePar: string | null;
  statutApprobation: string;
  demandePar: string | null;
  approuvePar: string | null;
  motifRefus: string | null;
  soldeCumule?: number;
  /** Nombre de pièces jointes archivées */
  nbPieces?: number;
};

export type ParametresApp = {
  annee: number;
  devise: string;
  seuilDoubleValidation: number;
  soldeInitialCaisse: number;
  tauxTVA: number;
};
