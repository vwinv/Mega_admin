import { MOIS_LABELS } from "@/lib/constants";
import { whereOperationApprouvee } from "@/lib/approbation";
import { prisma } from "@/lib/prisma";

export type Mouvement = {
  date: Date | null;
  entree: number | null;
  sortie: number | null;
};

export type LigneMensuelle = {
  mois: number;
  label: string;
  debut: number;
  entrees: number;
  sorties: number;
  fin: number;
};

function getMois(date: Date | null): number | null {
  if (!date) return null;
  return date.getUTCMonth() + 1;
}

function buildMensuel(
  ops: Mouvement[],
  soldeInitial: number,
  annee: number
): LigneMensuelle[] {
  const parMois = new Map<number, { entrees: number; sorties: number }>();

  for (let m = 1; m <= 12; m++) {
    parMois.set(m, { entrees: 0, sorties: 0 });
  }

  for (const op of ops) {
    if (!op.date) continue;
    if (op.date.getUTCFullYear() !== annee) continue;
    const mois = getMois(op.date);
    if (!mois) continue;
    const row = parMois.get(mois)!;
    row.entrees += op.entree ?? 0;
    row.sorties += op.sortie ?? 0;
  }

  let solde = soldeInitial;
  const lignes: LigneMensuelle[] = [];

  for (let m = 1; m <= 12; m++) {
    const { entrees, sorties } = parMois.get(m)!;
    const debut = solde;
    const fin = debut + entrees - sorties;
    lignes.push({
      mois: m,
      label: MOIS_LABELS[m - 1],
      debut,
      entrees,
      sorties,
      fin,
    });
    solde = fin;
  }

  return lignes;
}

export async function getSoldes() {
  const params = await prisma.parametre.findFirst();
  if (!params) return null;

  const [journalAgg, caisseAgg] = await Promise.all([
    prisma.operation.aggregate({
      where: whereOperationApprouvee,
      _sum: { entree: true, sortie: true },
    }),
    prisma.operationCaisse.aggregate({
      where: whereOperationApprouvee,
      _sum: { entree: true, sortie: true },
    }),
  ]);

  const entreesBanque = journalAgg._sum.entree ?? 0;
  const sortiesBanque = journalAgg._sum.sortie ?? 0;
  const entreesCaisse = caisseAgg._sum.entree ?? 0;
  const sortiesCaisse = caisseAgg._sum.sortie ?? 0;

  const soldeBanque =
    params.soldeInitialBanque + entreesBanque - sortiesBanque;
  const soldeCaisse =
    params.soldeInitialCaisse + entreesCaisse - sortiesCaisse;

  return {
    params,
    soldeBanque,
    soldeCaisse,
    tresorerieTotale: soldeBanque + soldeCaisse,
    entreesBanque,
    sortiesBanque,
    entreesCaisse,
    sortiesCaisse,
    entreesAnnee: entreesBanque + entreesCaisse,
    sortiesAnnee: sortiesBanque + sortiesCaisse,
    resultat:
      entreesBanque + entreesCaisse - (sortiesBanque + sortiesCaisse),
  };
}

export async function getTresorerieMensuelle() {
  const params = await prisma.parametre.findFirst();
  if (!params) return null;

  const [journal, caisse] = await Promise.all([
    prisma.operation.findMany({
      where: whereOperationApprouvee,
      select: { date: true, entree: true, sortie: true },
    }),
    prisma.operationCaisse.findMany({
      where: whereOperationApprouvee,
      select: { date: true, entree: true, sortie: true },
    }),
  ]);

  const banque = buildMensuel(journal, params.soldeInitialBanque, params.annee);
  const caisseRows = buildMensuel(
    caisse,
    params.soldeInitialCaisse,
    params.annee
  );

  const total = banque.map((b, i) => ({
    mois: b.mois,
    label: b.label,
    debut: b.debut + caisseRows[i].debut,
    entrees: b.entrees + caisseRows[i].entrees,
    sorties: b.sorties + caisseRows[i].sorties,
    fin: b.fin + caisseRows[i].fin,
  }));

  return { params, banque, caisse: caisseRows, total };
}

export async function getDonneesGraphiques() {
  const params = await prisma.parametre.findFirst();
  if (!params) return null;

  const tresorerie = await getTresorerieMensuelle();
  if (!tresorerie) return null;

  const fluxMensuel = tresorerie.total.map((t) => ({
    mois: t.label,
    entrees: t.entrees,
    sorties: t.sorties,
  }));

  const evolution = tresorerie.total.map((t) => ({
    mois: t.label,
    tresorerie: t.fin,
  }));

  return { params, fluxMensuel, evolution };
}

export function computeSoldeCaisseApres(
  ops: { entree: number | null; sortie: number | null }[],
  soldeInitial: number,
  excludeId?: string,
  opsWithId?: { id: string; entree: number | null; sortie: number | null }[]
) {
  let solde = soldeInitial;
  const list = opsWithId ?? ops.map((o, i) => ({ id: String(i), ...o }));
  for (const op of list) {
    if (excludeId && op.id === excludeId) continue;
    solde += (op.entree ?? 0) - (op.sortie ?? 0);
  }
  return solde;
}
