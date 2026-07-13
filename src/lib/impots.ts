import { MOIS_LABELS } from "@/lib/constants";
import {
  computeTotauxFacture,
  extractHtFromTtc,
  extractTvaFromTtc,
} from "@/lib/facturation";
import type {
  EcheanceRow,
  TvaSourceRef,
  TvaMensuelle,
} from "@/lib/impots-types";
import { computeTvaDue } from "@/lib/impots-types";
import { resolveStatutEcheance } from "@/lib/impots-statut";
import { prisma } from "@/lib/prisma";

export type { EcheanceRow, TvaSourceRef, TvaMensuelle };
export type { TvaFactureRef } from "@/lib/impots-types";
export { REFERENTIEL_IMPOTS, computeTvaDue } from "@/lib/impots-types";

/** Statuts exclus du calcul TVA collectée (pas encore émises / annulées). */
const STATUTS_FACTURE_EXCLUS_TVA = new Set(["BROUILLON", "ANNULE"]);

export async function getEcheances(): Promise<EcheanceRow[]> {
  const rows = await prisma.echeanceImpot.findMany({
    orderBy: { echeance: "asc" },
  });

  return rows.map((e) => {
    const statut = resolveStatutEcheance(e.statut, e.echeance);
    const paye = statut === "Payé";
    const reste = paye ? 0 : e.montantDu;
    return {
      id: e.id,
      echeance: e.echeance.toISOString(),
      impot: e.impot,
      periode: e.periode,
      montantDu: e.montantDu,
      datePaiement: e.datePaiement?.toISOString() ?? null,
      statut,
      resteAPayer: reste,
    };
  });
}

/** Met à jour en base les échéances dont la date est dépassée (hors « Payé »). */
export async function syncEcheancesEnRetard(): Promise<number> {
  const now = new Date();
  const rows = await prisma.echeanceImpot.findMany({
    where: { statut: { not: "Payé" } },
  });

  let updated = 0;
  for (const e of rows) {
    const effectif = resolveStatutEcheance(e.statut, e.echeance, now);
    if (effectif !== e.statut) {
      await prisma.echeanceImpot.update({
        where: { id: e.id },
        data: { statut: effectif },
      });
      updated++;
    }
  }
  return updated;
}

/**
 * Agrège les factures de l'année par mois civil (date facture),
 * avec TVA > 0 et statut émis (hors brouillon / annulé).
 */
async function getFacturesTvaParMois(
  annee: number
): Promise<Map<number, TvaSourceRef[]>> {
  const debut = new Date(Date.UTC(annee, 0, 1));
  const fin = new Date(Date.UTC(annee + 1, 0, 1));

  const rows = await prisma.facture.findMany({
    where: {
      date: { gte: debut, lt: fin },
      statut: { notIn: [...STATUTS_FACTURE_EXCLUS_TVA] },
      tauxTVA: { gt: 0 },
    },
    include: {
      client: true,
      lignes: { select: { prix: true } },
    },
    orderBy: { date: "asc" },
  });

  const byMois = new Map<number, TvaSourceRef[]>();

  for (const f of rows) {
    const totaux = computeTotauxFacture(
      f.lignes,
      f.reliquat,
      f.tauxTVA,
      f.montantPaye
    );
    if (totaux.tva <= 0) continue;

    const mois = f.date.getUTCMonth() + 1;
    const ref: TvaSourceRef = {
      id: f.id,
      source: "FACTURE",
      reference: f.numero,
      label: f.client.nom,
      date: f.date.toISOString(),
      statut: f.statut,
      totalHT: totaux.totalHT,
      tva: totaux.tva,
      totalTTC: totaux.totalTTC,
      tauxTVA: f.tauxTVA,
      href: `/facturation/factures/${f.id}`,
      sens: "collectee",
    };
    const list = byMois.get(mois) ?? [];
    list.push(ref);
    byMois.set(mois, list);
  }

  return byMois;
}

/**
 * Écritures journal avec TVA sélectionnée (approuvées, datées).
 * Entrée → collectée ; sortie → déductible.
 */
async function getJournalTvaParMois(
  annee: number
): Promise<Map<number, TvaSourceRef[]>> {
  const debut = new Date(Date.UTC(annee, 0, 1));
  const fin = new Date(Date.UTC(annee + 1, 0, 1));

  const rows = await prisma.operation.findMany({
    where: {
      date: { gte: debut, lt: fin },
      tauxTVA: { gt: 0 },
      statutApprobation: "APPROUVE",
      // Paiements de factures déjà comptés via la facture elle-même
      factureId: null,
    },
    orderBy: { date: "asc" },
  });

  const byMois = new Map<number, TvaSourceRef[]>();

  for (const op of rows) {
    if (!op.date) continue;
    const montant = op.entree ?? op.sortie ?? 0;
    const tva = extractTvaFromTtc(montant, op.tauxTVA);
    if (tva <= 0) continue;

    const ht = extractHtFromTtc(montant, op.tauxTVA);
    const sens: "collectee" | "deductible" =
      (op.entree ?? 0) > 0 ? "collectee" : "deductible";
    const mois = op.date.getUTCMonth() + 1;
    const ref: TvaSourceRef = {
      id: op.id,
      source: "JOURNAL",
      reference: op.numeroPiece || op.id.slice(0, 8),
      label: op.libelle,
      date: op.date.toISOString(),
      statut: sens === "collectee" ? "Entrée" : "Sortie",
      totalHT: ht,
      tva,
      totalTTC: montant,
      tauxTVA: op.tauxTVA,
      href: `/journal?op=${op.id}`,
      sens,
    };
    const list = byMois.get(mois) ?? [];
    list.push(ref);
    byMois.set(mois, list);
  }

  return byMois;
}

export async function getTvaMensuelle(annee: number): Promise<TvaMensuelle[]> {
  const [declarations, facturesParMois, journalParMois] = await Promise.all([
    prisma.tvaDeclaration.findMany({ where: { annee } }),
    getFacturesTvaParMois(annee),
    getJournalTvaParMois(annee),
  ]);
  const byMois = new Map(declarations.map((d) => [d.mois, d]));

  return MOIS_LABELS.map((label, idx) => {
    const mois = idx + 1;
    const decl = byMois.get(mois);
    const factures = facturesParMois.get(mois) ?? [];
    const journal = journalParMois.get(mois) ?? [];
    const sources = [...factures, ...journal].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const tvaFacturee = sources
      .filter((s) => s.sens === "collectee")
      .reduce((s, f) => s + f.tva, 0);
    const tvaDeductibleAuto = sources
      .filter((s) => s.sens === "deductible")
      .reduce((s, f) => s + f.tva, 0);
    // Affichage direct : collectée / déductible toujours issues des sources
    const collectee = tvaFacturee;
    const deductible = tvaDeductibleAuto;
    const creditReporte = decl?.creditReporte ?? 0;
    return {
      mois,
      label,
      collectee,
      deductible,
      creditReporte,
      tvaDue: computeTvaDue(collectee, deductible, creditReporte),
      tvaFacturee,
      tvaDeductibleAuto,
      factures: sources,
    };
  });
}

/**
 * Recalcule et enregistre collectée / déductible pour un mois
 * à partir des factures + écritures journal (TVA sélectionnée).
 */
export async function syncTvaDeclarationMois(
  annee: number,
  mois: number
): Promise<void> {
  if (mois < 1 || mois > 12) return;

  const lignes = await getTvaMensuelle(annee);
  const ligne = lignes.find((l) => l.mois === mois);
  if (!ligne) return;

  const existing = await prisma.tvaDeclaration.findUnique({
    where: { annee_mois: { annee, mois } },
  });

  await prisma.tvaDeclaration.upsert({
    where: { annee_mois: { annee, mois } },
    create: {
      annee,
      mois,
      collectee: ligne.tvaFacturee,
      deductible: ligne.tvaDeductibleAuto,
      creditReporte: 0,
    },
    update: {
      collectee: ligne.tvaFacturee,
      deductible: ligne.tvaDeductibleAuto,
      creditReporte: existing?.creditReporte ?? 0,
    },
  });
}
