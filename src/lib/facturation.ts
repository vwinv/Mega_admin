export const STATUTS_DEVIS = [
  "BROUILLON",
  "ENVOYE",
  "ACCEPTE",
  "REFUSE",
  "FACTURE",
] as const;

export const STATUTS_FACTURE = [
  "BROUILLON",
  "ENVOYE",
  "PARTIEL",
  "PAYE",
  "ANNULE",
] as const;

export const STATUT_DEVIS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  FACTURE: "Facturé",
};

export const STATUT_FACTURE_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyée",
  PARTIEL: "Paiement partiel",
  PAYE: "Payée",
  ANNULE: "Annulée",
};

export const MEGA_BRAND = "#c55a51";
export const MEGA_ROW_ALT = "#fff9f4";
export const MEGA_ROW_BORDER = "#e8d5d2";

export type LigneDoc = {
  id?: string;
  ordre: number;
  designation: string;
  details: string[];
  duree?: string | null;
  prix: number;
  styleAccent: boolean;
};

export type TotauxFacture = {
  /** Somme des lignes avant remise */
  brutHT: number;
  /** Remise appliquée (FCFA) */
  remise: number;
  /** HT après remise */
  totalHT: number;
  tva: number;
  totalTTC: number;
  reliquat: number;
  totalGeneral: number;
  resteAPayer: number;
};

/** Normalise un % saisi (10 ou 0.1 → 0.1). */
export function normalizeRemisePourcent(raw: number): number {
  if (!raw || raw <= 0 || Number.isNaN(raw)) return 0;
  const p = raw > 1 ? raw / 100 : raw;
  return Math.min(1, p);
}

export function computeRemiseFcfa(
  brutHT: number,
  remiseMontant = 0,
  remisePourcent = 0
): number {
  if (brutHT <= 0) return 0;
  const p = normalizeRemisePourcent(remisePourcent);
  if (p > 0) return Math.min(brutHT, Math.round(brutHT * p));
  return Math.min(brutHT, Math.max(0, Math.round(remiseMontant || 0)));
}

export function labelRemise(remisePourcent = 0): string {
  const p = normalizeRemisePourcent(remisePourcent);
  if (p > 0) return `Remise ${Math.round(p * 100)} %`;
  return "Remise";
}

export function parseDetailsJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split("\n").filter(Boolean);
  }
}

export function detailsToJson(details: string[]): string | null {
  const clean = details.map((d) => d.trim()).filter(Boolean);
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

export function computeTotauxFacture(
  lignes: { prix: number }[],
  reliquat: number,
  tauxTVA: number,
  montantPaye = 0,
  remiseMontant = 0,
  remisePourcent = 0
): TotauxFacture {
  const brutHT = lignes.reduce((s, l) => s + l.prix, 0);
  const remise = computeRemiseFcfa(brutHT, remiseMontant, remisePourcent);
  const totalHT = Math.max(0, brutHT - remise);
  const tva = Math.round(totalHT * tauxTVA);
  const totalTTC = totalHT + tva;
  const totalGeneral = totalTTC + reliquat;
  const resteAPayer = Math.max(0, totalGeneral - montantPaye);
  return {
    brutHT,
    remise,
    totalHT,
    tva,
    totalTTC,
    reliquat,
    totalGeneral,
    resteAPayer,
  };
}

/** Extrait la TVA d'un montant TTC (ex. écriture journal bancaire). */
export function extractTvaFromTtc(montantTtc: number, tauxTVA: number): number {
  if (tauxTVA <= 0 || montantTtc <= 0) return 0;
  return Math.round(montantTtc * (tauxTVA / (1 + tauxTVA)));
}

/** HT correspondant à un montant TTC. */
export function extractHtFromTtc(montantTtc: number, tauxTVA: number): number {
  if (tauxTVA <= 0 || montantTtc <= 0) return montantTtc;
  return montantTtc - extractTvaFromTtc(montantTtc, tauxTVA);
}

export function formatNumeroDoc(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export async function nextNumeroDevis(
  count: () => Promise<number>
): Promise<string> {
  const n = (await count()) + 1;
  return formatNumeroDoc("", n);
}

/** Prochain n° facture : F0001, F0002… */
export async function nextNumeroFacture(
  listNumeros: () => Promise<string[]>
): Promise<string> {
  const numeros = await listNumeros();
  let max = 0;
  for (const raw of numeros) {
    const m = /^F(\d+)$/i.exec(raw.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return formatNumeroDoc("F", max + 1);
}

/** Facture soumise au client (hors brouillon / annulée) → approbation CEO requise. */
export function factureSoumise(statut: string): boolean {
  return statut !== "BROUILLON" && statut !== "ANNULE";
}

/**
 * Champs d'approbation à appliquer sur une facture.
 * Si `autoApprove` (créateur = CEO / Admin), pas de file d'attente.
 */
export function approvalFieldsForFacture(
  statut: string,
  acteurNom: string,
  existing?: { statut: string; statutApprobation: string },
  options?: { autoApprove?: boolean }
) {
  const cleared = {
    demandePar: null as string | null,
    demandeAt: null as Date | null,
    approuvePar: null as string | null,
    approuveAt: null as Date | null,
    motifRefus: null as string | null,
  };

  if (!factureSoumise(statut)) {
    return { statutApprobation: "APPROUVE" as const, ...cleared };
  }

  if (
    existing?.statutApprobation === "APPROUVE" &&
    existing.statut === statut
  ) {
    return {};
  }

  if (options?.autoApprove) {
    return {
      statutApprobation: "APPROUVE" as const,
      demandePar: null as string | null,
      demandeAt: null as Date | null,
      approuvePar: acteurNom,
      approuveAt: new Date(),
      motifRefus: null as string | null,
    };
  }

  return {
    statutApprobation: "EN_ATTENTE_CEO" as const,
    demandePar: acteurNom,
    demandeAt: new Date(),
    approuvePar: null,
    approuveAt: null,
    motifRefus: null,
  };
}
