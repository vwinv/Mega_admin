export type LigneRapprochement = {
  mois: number;
  label: string;
  soldeCalcule: number;
  soldeReleve: number | null;
  ecart: number | null;
};

export type ChecklistCell = {
  mois: number;
  tacheId: number;
  statut: string;
};
