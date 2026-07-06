import {
  APPROVISIONNEMENT_CAISSE,
  TRANSFERT_VERS_CAISSE,
  isMouvementInterne,
} from "@/lib/constants";
import type { Controle } from "@/lib/controle-helpers";
import { resolveStatutEcheance } from "@/lib/impots-statut";
import { whereOperationApprouvee } from "@/lib/approbation";
import { prisma } from "@/lib/prisma";
import { getSoldes } from "@/lib/tresorerie";

export type { Controle };

export async function runControles(): Promise<Controle[]> {
  const params = await prisma.parametre.findFirst();
  if (!params) return [];

  const [journal, caisse, codes, echeances] = await Promise.all([
    prisma.operation.findMany({
      where: whereOperationApprouvee,
      include: { categorie: true },
    }),
    prisma.operationCaisse.findMany({
      where: whereOperationApprouvee,
      include: { categorie: true },
    }),
    prisma.codeBudgetaire.findMany(),
    prisma.echeanceImpot.findMany(),
  ]);

  const controles: Controle[] = [];

  const sansDate =
    journal.filter((o) => !o.date).length +
    caisse.filter((o) => !o.date).length;
  controles.push({
    id: 1,
    libelle: "Opérations sans date",
    statut: sansDate === 0 ? "OK" : "ALERTE",
    detail: sansDate === 0 ? "Toutes les opérations ont une date." : `${sansDate} opération(s) sans date.`,
  });

  const sansCategorie = 0;
  controles.push({
    id: 2,
    libelle: "Opérations sans catégorie",
    statut: sansCategorie === 0 ? "OK" : "ALERTE",
    detail: "Toutes les opérations ont une catégorie.",
  });

  const sansPiece =
    journal.filter((o) => !o.numeroPiece?.trim()).length +
    caisse.filter((o) => !o.numeroPiece?.trim()).length;
  controles.push({
    id: 3,
    libelle: "Opérations sans n° de pièce",
    statut: sansPiece === 0 ? "OK" : "ALERTE",
    detail:
      sansPiece === 0
        ? "Tous les numéros de pièce sont renseignés."
        : `${sansPiece} opération(s) sans n° de pièce.`,
  });

  const sortiesSansCode =
    journal.filter(
      (o) =>
        (o.sortie ?? 0) > 0 &&
        !o.codeBudgetaireId &&
        !isMouvementInterne(o.categorie.nom, o.categorie.codeCompte)
    ).length +
    caisse.filter(
      (o) =>
        (o.sortie ?? 0) > 0 &&
        !o.codeBudgetaireId &&
        !isMouvementInterne(o.categorie.nom, o.categorie.codeCompte)
    ).length;
  controles.push({
    id: 4,
    libelle: "Sorties sans code budgétaire",
    statut: sortiesSansCode === 0 ? "OK" : "ALERTE",
    detail:
      sortiesSansCode === 0
        ? "Toutes les sorties ont un code budgétaire."
        : `${sortiesSansCode} sortie(s) sans code budgétaire.`,
  });

  const doubleMontant =
    journal.filter((o) => (o.entree ?? 0) > 0 && (o.sortie ?? 0) > 0).length +
    caisse.filter((o) => (o.entree ?? 0) > 0 && (o.sortie ?? 0) > 0).length;
  controles.push({
    id: 5,
    libelle: "Lignes avec entrée ET sortie",
    statut: doubleMontant === 0 ? "OK" : "ALERTE",
    detail:
      doubleMontant === 0
        ? "Aucune ligne avec entrée et sortie simultanées."
        : `${doubleMontant} ligne(s) incohérente(s).`,
  });

  const seen = new Set<string>();
  let doublons = 0;
  for (const op of [...journal, ...caisse]) {
    const montant = op.entree ?? op.sortie ?? 0;
    const key = `${op.date?.toISOString() ?? "null"}|${op.libelle}|${montant}`;
    if (seen.has(key)) doublons++;
    else seen.add(key);
  }
  controles.push({
    id: 6,
    libelle: "Doublons potentiels",
    statut: doublons === 0 ? "OK" : "ALERTE",
    detail:
      doublons === 0
        ? "Aucun doublon détecté."
        : `${doublons} doublon(s) potentiel(s).`,
  });

  const soldes = await getSoldes();
  const soldeCaisseNeg = soldes && soldes.soldeCaisse < 0;
  controles.push({
    id: 7,
    libelle: "Solde de caisse négatif",
    statut: soldeCaisseNeg ? "ALERTE" : "OK",
    detail: soldeCaisseNeg
      ? `Solde caisse : ${soldes!.soldeCaisse.toLocaleString("fr-FR")} FCFA.`
      : "Le solde de caisse est positif ou nul.",
  });

  const { getTresorerieMensuelle } = await import("@/lib/tresorerie");
  const treso = await getTresorerieMensuelle();
  const banqueNeg = treso?.banque.some((m) => m.fin < 0) ?? false;
  controles.push({
    id: 8,
    libelle: "Solde bancaire mensuel négatif",
    statut: banqueNeg ? "ALERTE" : "OK",
    detail: banqueNeg
      ? "Au moins un mois avec solde bancaire négatif."
      : "Tous les soldes bancaires mensuels sont positifs ou nuls.",
  });

  const transfertJournal = journal
    .filter((o) => o.categorie.nom === TRANSFERT_VERS_CAISSE)
    .reduce((s, o) => s + (o.sortie ?? 0), 0);
  const approCaisse = caisse
    .filter((o) => o.categorie.nom === APPROVISIONNEMENT_CAISSE)
    .reduce((s, o) => s + (o.entree ?? 0), 0);
  const ecartTransfert = transfertJournal - approCaisse;
  controles.push({
    id: 9,
    libelle: "Écart transferts banque ↔ caisse",
    statut: ecartTransfert === 0 ? "OK" : "ALERTE",
    detail:
      ecartTransfert === 0
        ? "Les transferts internes sont équilibrés."
        : `Écart de ${ecartTransfert.toLocaleString("fr-FR")} FCFA entre journal et caisse.`,
  });

  const { getDepenseParCodeBudgetaire } = await import("@/lib/budget");
  const codesData = await getDepenseParCodeBudgetaire();
  const depasses = codesData.filter((c) => c.depasse).length;
  controles.push({
    id: 10,
    libelle: "Enveloppes budgétaires dépassées",
    statut: depasses === 0 ? "OK" : "ALERTE",
    detail:
      depasses === 0
        ? "Aucune enveloppe dépassée."
        : `${depasses} enveloppe(s) dépassée(s).`,
  });

  const budgetData = await import("@/lib/budget").then((m) =>
    m.getBudgetData(params.annee)
  );
  const depasseBudget = budgetData.lignes.filter(
    (l) => l.categorie.sens === "sortie" && l.totalRealise > l.totalBudget && l.totalBudget > 0
  ).length;
  controles.push({
    id: 11,
    libelle: "Réalisé sorties > budget annuel",
    statut: depasseBudget === 0 ? "OK" : "ALERTE",
    detail:
      depasseBudget === 0
        ? "Le réalisé est dans les budgets."
        : `${depasseBudget} catégorie(s) au-dessus du budget.`,
  });

  const plafondDepasse = soldes && soldes.soldeCaisse > params.plafondCaisse;
  controles.push({
    id: 12,
    libelle: "Solde caisse > plafond autorisé",
    statut: plafondDepasse ? "ALERTE" : "OK",
    detail: plafondDepasse
      ? `Solde ${soldes!.soldeCaisse.toLocaleString("fr-FR")} > plafond ${params.plafondCaisse.toLocaleString("fr-FR")} FCFA.`
      : `Plafond caisse : ${params.plafondCaisse.toLocaleString("fr-FR")} FCFA respecté.`,
  });

  const impotsRetard = echeances.filter(
    (e) => resolveStatutEcheance(e.statut, e.echeance) === "En retard"
  ).length;
  controles.push({
    id: 13,
    libelle: "Échéances d'impôts en retard",
    statut: impotsRetard === 0 ? "OK" : "ALERTE",
    detail:
      impotsRetard === 0
        ? "Aucune échéance en retard."
        : `${impotsRetard} échéance(s) en retard.`,
  });

  return controles;
}

export async function countAlertes(): Promise<number> {
  const controles = await runControles();
  return controles.filter((c) => c.statut === "ALERTE").length;
}
