export const ROLES = [
  "ADMIN",
  "CEO",
  "COMPTABLE",
  "VALIDATEUR",
  "LECTURE_SEULE",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  CEO: "CEO / Directrice générale",
  COMPTABLE: "Comptable",
  VALIDATEUR: "Validateur",
  LECTURE_SEULE: "Lecture seule",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Accès complet, gestion des utilisateurs et paramètres",
  CEO: "Approbation des opérations ≥ seuil, consultation complète",
  COMPTABLE: "Saisie journal, caisse, budget, import Excel",
  VALIDATEUR: "Consultation + suivi des validations",
  LECTURE_SEULE: "Consultation uniquement (tableaux, synthèse)",
};

/** Niveau de priorité (plus élevé = plus de droits). */
export const ROLE_PRIORITY: Record<Role, number> = {
  ADMIN: 5,
  CEO: 4,
  COMPTABLE: 3,
  VALIDATEUR: 2,
  LECTURE_SEULE: 1,
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    "Tout l'application",
    "Gestion utilisateurs & e-mails",
    "Paramètres système",
    "Approbations CEO",
    "Journal d'audit",
  ],
  CEO: [
    "Approbation factures & opérations",
    "Consultation complète",
    "Trésorerie & pilotage",
  ],
  COMPTABLE: [
    "Saisie journal & caisse",
    "Facturation & devis",
    "Budget & import Excel",
    "Gestion catégories",
  ],
  VALIDATEUR: ["Consultation", "Suivi validations"],
  LECTURE_SEULE: ["Consultation seule (pas de saisie)"],
};

export function canWrite(role: Role): boolean {
  return role !== "LECTURE_SEULE";
}

export function canImport(role: Role): boolean {
  return role === "ADMIN" || role === "COMPTABLE";
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageParametres(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageCategories(role: Role): boolean {
  return role === "ADMIN" || role === "COMPTABLE";
}

/** Seule la CEO (ou l'admin) approuve les opérations ≥ seuil. */
export function canApproveCeo(role: Role): boolean {
  return role === "CEO" || role === "ADMIN";
}

export function canValidate(role: Role): boolean {
  return canApproveCeo(role);
}
