export type PlanComptableRow = {
  categorie: string;
  code: string;
  intitule: string;
  sens: string;
};

export type CodeBudgetaireRow = {
  code: string;
  beneficiaire: string;
  enveloppe: number;
};

export type JournalRow = {
  date: string | null;
  piece: string | null;
  libelle: string;
  categorie: string;
  code_budgetaire: string | null;
  mode: string | null;
  entree: number | null;
  sortie: number | null;
  observations: string | null;
};

export type CaisseRow = {
  date: string | null;
  piece: string | null;
  motif: string;
  categorie: string;
  code_budgetaire: string | null;
  entree: number | null;
  sortie: number | null;
};

export type BudgetPrevisionnelRow = {
  categorie: string;
  mois: number;
  montant: number;
};

export type MegaData = {
  entreprise: string;
  devise: string;
  annee: number;
  soldes_initiaux: { banque: number; caisse: number };
  plan_comptable: PlanComptableRow[];
  codes_budgetaires: CodeBudgetaireRow[];
  journal: JournalRow[];
  petite_caisse: CaisseRow[];
  budget_previsionnel?: BudgetPrevisionnelRow[];
};

export type ImportResult = {
  categories: number;
  codesBudgetaires: number;
  journal: number;
  caisse: number;
  budgetLignes: number;
  warnings: string[];
};
