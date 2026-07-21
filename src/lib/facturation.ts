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

export const MEGA_BRAND = "#d65a5a";

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
  totalHT: number;
  tva: number;
  totalTTC: number;
  reliquat: number;
  totalGeneral: number;
  resteAPayer: number;
};

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
  montantPaye = 0
): TotauxFacture {
  const totalHT = lignes.reduce((s, l) => s + l.prix, 0);
  const tva = Math.round(totalHT * tauxTVA);
  const totalTTC = totalHT + tva;
  const totalGeneral = totalTTC + reliquat;
  const resteAPayer = Math.max(0, totalGeneral - montantPaye);
  return { totalHT, tva, totalTTC, reliquat, totalGeneral, resteAPayer };
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

export function approvalFieldsForFacture(
  statut: string,
  demandePar: string,
  existing?: { statut: string; statutApprobation: string }
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

  return {
    statutApprobation: "EN_ATTENTE_CEO" as const,
    demandePar,
    demandeAt: new Date(),
    approuvePar: null,
    approuveAt: null,
    motifRefus: null,
  };
}
