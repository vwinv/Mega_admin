import { STATUTS_ECHEANCE } from "@/lib/constants";

export type StatutEcheance = (typeof STATUTS_ECHEANCE)[number];

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Calcule le statut effectif : « En retard » si échéance dépassée et non payé. */
export function resolveStatutEcheance(
  storedStatut: string,
  echeance: Date,
  now: Date = new Date()
): StatutEcheance {
  if (storedStatut === "Payé") return "Payé";
  if (startOfUtcDay(echeance) < startOfUtcDay(now)) return "En retard";
  return "En attente";
}

export function isEcheanceEnRetard(
  storedStatut: string,
  echeance: Date,
  now: Date = new Date()
): boolean {
  return resolveStatutEcheance(storedStatut, echeance, now) === "En retard";
}
