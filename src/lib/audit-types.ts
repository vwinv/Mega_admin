export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "IMPORT",
  "EXPORT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITIES = [
  "Operation",
  "OperationCaisse",
  "User",
  "Categorie",
  "CodeBudgetaire",
  "BudgetLigne",
  "Parametre",
  "EcheanceImpot",
  "TvaDeclaration",
  "Rapprochement",
  "Checklist",
  "Import",
  "Client",
  "Devis",
  "Facture",
] as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export type AuditLogRow = {
  id: string;
  userId: string | null;
  userNom: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  IMPORT: "Import",
  EXPORT: "Export",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Operation: "Journal",
  OperationCaisse: "Petite caisse",
  User: "Utilisateur",
  Categorie: "Catégorie",
  CodeBudgetaire: "Code budgétaire",
  BudgetLigne: "Budget",
  Parametre: "Paramètres",
  EcheanceImpot: "Échéance impôt",
  TvaDeclaration: "TVA",
  Rapprochement: "Rapprochement",
  Checklist: "Checklist",
  Import: "Import Excel",
  Client: "Client",
  Devis: "Devis",
  Facture: "Facture",
};
