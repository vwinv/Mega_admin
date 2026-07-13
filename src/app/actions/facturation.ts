"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import {
  approvalFieldsForFacture,
  computeTotauxFacture,
  detailsToJson,
  nextNumeroDevis,
  parseDetailsJson,
  type LigneDoc,
} from "@/lib/facturation";
import { ensureNumeroFactureUnique, nextNumeroPieceBanque } from "@/lib/numero-piece";
import { prisma } from "@/lib/prisma";

const PATHS = ["/facturation", "/journal", "/tresorerie", "/impots", "/"];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export type ClientRow = {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
};

export type DevisRow = {
  id: string;
  numero: string;
  titre: string;
  date: string;
  statut: string;
  clientNom: string;
  clientId: string;
  totalHT: number;
  hasFacture: boolean;
};

export type FactureRow = {
  id: string;
  numero: string;
  titre: string | null;
  date: string;
  statut: string;
  statutApprobation: string;
  clientNom: string;
  clientId: string;
  totalTTC: number;
  totalGeneral: number;
  resteAPayer: number;
};

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listClients(): Promise<ClientRow[]> {
  const rows = await prisma.clientFacturation.findMany({
    orderBy: { nom: "asc" },
  });
  return rows.map((c) => ({
    id: c.id,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
  }));
}

export async function createClient(input: {
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;
  if (!input.nom.trim()) return { ok: false, error: "Le nom du client est obligatoire." };

  const c = await prisma.clientFacturation.create({
    data: {
      nom: input.nom.trim(),
      email: input.email?.trim() || null,
      telephone: input.telephone?.trim() || null,
      adresse: input.adresse?.trim() || null,
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Client",
    entityId: c.id,
    details: c.nom,
  });

  revalidate();
  return { ok: true, id: c.id };
}

export async function listDevis(): Promise<DevisRow[]> {
  const rows = await prisma.devis.findMany({
    include: { client: true, lignes: true, facture: { select: { id: true } } },
    orderBy: { date: "desc" },
  });
  return rows.map((d) => ({
    id: d.id,
    numero: d.numero,
    titre: d.titre,
    date: d.date.toISOString(),
    statut: d.statut,
    clientNom: d.client.nom,
    clientId: d.clientId,
    totalHT: d.lignes.reduce((s, l) => s + l.prix, 0),
    hasFacture: !!d.facture,
  }));
}

export async function listFactures(): Promise<FactureRow[]> {
  const rows = await prisma.facture.findMany({
    include: { client: true, lignes: true },
    orderBy: { date: "desc" },
  });
  return rows.map((f) => {
    const totaux = computeTotauxFacture(
      f.lignes,
      f.reliquat,
      f.tauxTVA,
      f.montantPaye
    );
    return {
      id: f.id,
      numero: f.numero,
      titre: f.titre,
      date: f.date.toISOString(),
      statut: f.statut,
      statutApprobation: f.statutApprobation,
      clientNom: f.client.nom,
      clientId: f.clientId,
      totalTTC: totaux.totalTTC,
      totalGeneral: totaux.totalGeneral,
      resteAPayer: totaux.resteAPayer,
    };
  });
}

export async function getDevisComplet(id: string) {
  const d = await prisma.devis.findUnique({
    where: { id },
    include: { client: true, lignes: { orderBy: { ordre: "asc" } }, facture: true },
  });
  if (!d) return null;
  const params = await prisma.parametre.findFirst();
  return {
    id: d.id,
    numero: d.numero,
    titre: d.titre,
    date: d.date.toISOString(),
    statut: d.statut,
    notes: d.notes,
    client: d.client,
    factureId: d.facture?.id ?? null,
    lignes: d.lignes.map((l) => ({
      id: l.id,
      ordre: l.ordre,
      designation: l.designation,
      details: parseDetailsJson(l.details),
      duree: l.duree,
      prix: l.prix,
      styleAccent: l.styleAccent,
    })),
    totalHT: d.lignes.reduce((s, l) => s + l.prix, 0),
    entreprise: params,
  };
}

export async function getFactureComplet(id: string) {
  const f = await prisma.facture.findUnique({
    where: { id },
    include: {
      client: true,
      lignes: { orderBy: { ordre: "asc" } },
      devis: { select: { numero: true, titre: true } },
    },
  });
  if (!f) return null;
  const params = await prisma.parametre.findFirst();
  const totaux = computeTotauxFacture(
    f.lignes,
    f.reliquat,
    f.tauxTVA,
    f.montantPaye
  );
  return {
    id: f.id,
    numero: f.numero,
    titre: f.titre,
    date: f.date.toISOString(),
    statut: f.statut,
    notes: f.notes,
    reliquat: f.reliquat,
    reliquatLabel: f.reliquatLabel,
    tauxTVA: f.tauxTVA,
    montantPaye: f.montantPaye,
    datePaiement: f.datePaiement?.toISOString() ?? null,
    operationId: f.operationId,
    statutApprobation: f.statutApprobation,
    demandePar: f.demandePar,
    demandeAt: f.demandeAt?.toISOString() ?? null,
    approuvePar: f.approuvePar,
    approuveAt: f.approuveAt?.toISOString() ?? null,
    motifRefus: f.motifRefus,
    client: f.client,
    devis: f.devis,
    lignes: f.lignes.map((l) => ({
      id: l.id,
      ordre: l.ordre,
      designation: l.designation,
      details: parseDetailsJson(l.details),
      prix: l.prix,
      styleAccent: l.styleAccent,
    })),
    totaux,
    entreprise: params,
  };
}

export async function saveDevis(
  input: {
    id?: string;
    titre: string;
    date: string;
    clientId: string;
    statut?: string;
    notes?: string;
    lignes: LigneDoc[];
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  if (!input.titre.trim()) return { ok: false, error: "Le titre est obligatoire." };
  if (!input.clientId) return { ok: false, error: "Le client est obligatoire." };
  if (input.lignes.length === 0) {
    return { ok: false, error: "Ajoutez au moins une ligne." };
  }

  const lignesData = input.lignes.map((l, i) => ({
    ordre: i,
    designation: l.designation.trim(),
    details: detailsToJson(l.details),
    duree: l.duree?.trim() || null,
    prix: l.prix,
    styleAccent: l.styleAccent,
  }));

  if (input.id) {
    await prisma.devisLigne.deleteMany({ where: { devisId: input.id } });
    await prisma.devis.update({
      where: { id: input.id },
      data: {
        titre: input.titre.trim(),
        date: parseDate(input.date),
        clientId: input.clientId,
        statut: input.statut ?? "BROUILLON",
        notes: input.notes?.trim() || null,
        lignes: { create: lignesData },
      },
    });
    await logAudit({
      userId: guard.id,
      userNom: guard.nom,
      action: "UPDATE",
      entity: "Devis",
      entityId: input.id,
      details: input.titre,
    });
    revalidate();
    return { ok: true, id: input.id };
  }

  const numero = await nextNumeroDevis(() => prisma.devis.count());
  const created = await prisma.devis.create({
    data: {
      numero,
      titre: input.titre.trim(),
      date: parseDate(input.date),
      clientId: input.clientId,
      statut: input.statut ?? "BROUILLON",
      notes: input.notes?.trim() || null,
      lignes: { create: lignesData },
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Devis",
    entityId: created.id,
    details: `${numero} · ${input.titre}`,
  });

  revalidate();
  return { ok: true, id: created.id };
}

export async function saveFacture(
  input: {
    id?: string;
    numero?: string;
    titre?: string;
    date: string;
    clientId: string;
    statut?: string;
    reliquat?: number;
    reliquatLabel?: string;
    notes?: string;
    lignes: LigneDoc[];
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  if (!input.clientId) return { ok: false, error: "Le client est obligatoire." };
  if (input.lignes.length === 0) {
    return { ok: false, error: "Ajoutez au moins une ligne." };
  }

  const params = await prisma.parametre.findFirst();
  const tauxTVA = params?.tauxTVA ?? 0.18;

  const lignesData = input.lignes.map((l, i) => ({
    ordre: i,
    designation: l.designation.trim(),
    details: detailsToJson(l.details),
    prix: l.prix,
    styleAccent: l.styleAccent,
  }));

  const statutFinal = input.statut ?? "BROUILLON";

  if (input.id) {
    const existing = await prisma.facture.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false, error: "Facture introuvable." };

    const numero = (input.numero ?? existing.numero).trim();
    const numeroErr = await ensureNumeroFactureUnique(prisma, numero, input.id);
    if (numeroErr) return { ok: false, error: numeroErr };

    const approval = approvalFieldsForFacture(statutFinal, guard.nom, {
      statut: existing.statut,
      statutApprobation: existing.statutApprobation,
    });

    await prisma.factureLigne.deleteMany({ where: { factureId: input.id } });
    await prisma.facture.update({
      where: { id: input.id },
      data: {
        numero,
        titre: input.titre?.trim() || null,
        date: parseDate(input.date),
        clientId: input.clientId,
        statut: statutFinal,
        reliquat: input.reliquat ?? 0,
        reliquatLabel: input.reliquatLabel?.trim() || "Reliquat",
        notes: input.notes?.trim() || null,
        tauxTVA,
        ...approval,
        lignes: { create: lignesData },
      },
    });
    revalidate();
    return { ok: true, id: input.id };
  }

  const numero = input.numero?.trim() ?? "";
  const numeroErr = await ensureNumeroFactureUnique(prisma, numero);
  if (numeroErr) return { ok: false, error: numeroErr };

  const approval = approvalFieldsForFacture(statutFinal, guard.nom);
  const created = await prisma.facture.create({
    data: {
      numero,
      titre: input.titre?.trim() || null,
      date: parseDate(input.date),
      clientId: input.clientId,
      statut: statutFinal,
      reliquat: input.reliquat ?? 0,
      reliquatLabel: input.reliquatLabel?.trim() || "Reliquat",
      notes: input.notes?.trim() || null,
      tauxTVA,
      ...approval,
      lignes: { create: lignesData },
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Facture",
    entityId: created.id,
    details: `${numero}`,
  });

  revalidate();
  return { ok: true, id: created.id };
}

export async function convertirDevisEnFacture(
  devisId: string,
  numero: string,
  reliquat = 0
): Promise<{ ok: true; factureId: string } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const numeroErr = await ensureNumeroFactureUnique(prisma, numero);
  if (numeroErr) return { ok: false, error: numeroErr };

  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { lignes: true, facture: true },
  });
  if (!devis) return { ok: false, error: "Devis introuvable." };
  if (devis.facture) return { ok: false, error: "Ce devis est déjà facturé." };

  const params = await prisma.parametre.findFirst();

  const facture = await prisma.facture.create({
    data: {
      numero: numero.trim(),
      titre: devis.titre,
      date: new Date(),
      clientId: devis.clientId,
      devisId: devis.id,
      statut: "ENVOYE",
      reliquat,
      tauxTVA: params?.tauxTVA ?? 0.18,
      statutApprobation: "EN_ATTENTE_CEO",
      demandePar: guard.nom,
      demandeAt: new Date(),
      lignes: {
        create: devis.lignes.map((l) => ({
          ordre: l.ordre,
          designation: l.designation,
          details: l.details,
          prix: l.prix,
          styleAccent: l.styleAccent,
        })),
      },
    },
  });

  await prisma.devis.update({
    where: { id: devisId },
    data: { statut: "FACTURE" },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Facture",
    entityId: facture.id,
    details: `Depuis devis ${devis.numero}`,
  });

  revalidate();
  return { ok: true, factureId: facture.id };
}

export async function enregistrerPaiementFacture(
  factureId: string,
  montant: number,
  datePaiement?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { client: true, lignes: true },
  });
  if (!facture) return { ok: false, error: "Facture introuvable." };

  if (facture.statutApprobation !== "APPROUVE") {
    return {
      ok: false,
      error:
        "Cette facture doit être approuvée par la CEO avant d'enregistrer un paiement.",
    };
  }

  const totaux = computeTotauxFacture(
    facture.lignes,
    facture.reliquat,
    facture.tauxTVA,
    facture.montantPaye
  );

  if (montant <= 0) return { ok: false, error: "Montant invalide." };
  if (montant > totaux.resteAPayer) {
    return { ok: false, error: "Le montant dépasse le reste à payer." };
  }

  const nouveauPaye = facture.montantPaye + montant;
  const totauxApres = computeTotauxFacture(
    facture.lignes,
    facture.reliquat,
    facture.tauxTVA,
    nouveauPaye
  );
  const statut =
    totauxApres.resteAPayer === 0
      ? "PAYE"
      : nouveauPaye > 0
        ? "PARTIEL"
        : facture.statut;

  const payDate = datePaiement
    ? parseDate(datePaiement)
    : new Date();

  let operationId = facture.operationId;

  const catEntree = await prisma.categorie.findFirst({
    where: { sens: "entree" },
    orderBy: { nom: "asc" },
  });
  if (catEntree) {
    const numeroPiece = await nextNumeroPieceBanque(prisma, payDate);
    const op = await prisma.operation.create({
      data: {
        date: payDate,
        libelle: `Facture ${facture.numero} · ${facture.client.nom}`,
        categorieId: catEntree.id,
        entree: montant,
        sortie: null,
        numeroPiece,
        factureId,
        statutApprobation: "APPROUVE",
        validePar: guard.nom,
        observations:
          totauxApres.resteAPayer > 0
            ? `Paiement partiel · Facture ${facture.numero}`
            : `Facture ${facture.numero}`,
      },
    });
    if (!operationId) operationId = op.id;
  }

  await prisma.facture.update({
    where: { id: factureId },
    data: {
      montantPaye: nouveauPaye,
      datePaiement: payDate,
      statut,
      operationId,
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "Facture",
    entityId: factureId,
    details: `Paiement ${montant.toLocaleString("fr-FR")} FCFA · ${facture.numero}`,
  });

  revalidate();
  return { ok: true };
}

export async function deleteDevis(
  devisId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { facture: { select: { id: true } } },
  });
  if (!devis) return { ok: false, error: "Devis introuvable." };
  if (devis.facture) {
    return {
      ok: false,
      error: "Supprimez d'abord la facture liée à ce devis.",
    };
  }

  await prisma.devis.delete({ where: { id: devisId } });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "Devis",
    entityId: devisId,
    details: devis.numero,
  });

  revalidate();
  return { ok: true };
}

export async function deleteFacture(
  factureId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { devis: true },
  });
  if (!facture) return { ok: false, error: "Facture introuvable." };

  const ops = await prisma.operation.findMany({
    where: { factureId },
  });

  await prisma.$transaction(async (tx) => {
    for (const op of ops) {
      await tx.operation.delete({ where: { id: op.id } });
    }
    if (facture.devisId) {
      await tx.devis.update({
        where: { id: facture.devisId },
        data: { statut: "ACCEPTE" },
      });
    }
    await tx.facture.delete({ where: { id: factureId } });
  });

  for (const op of ops) {
    await logAudit({
      userId: guard.id,
      userNom: guard.nom,
      action: "DELETE",
      entity: "Operation",
      entityId: op.id,
      details: `Liée à facture ${facture.numero} · ${op.libelle}`,
    });
  }

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "Facture",
    entityId: factureId,
    details: facture.numero,
  });

  revalidate();
  return { ok: true };
}

export async function getFacturationStats() {
  const factures = await prisma.facture.findMany({
    include: { lignes: true },
  });
  let facture = 0;
  let encaisse = 0;
  let enAttente = 0;
  for (const f of factures) {
    const t = computeTotauxFacture(f.lignes, f.reliquat, f.tauxTVA, f.montantPaye);
    facture += t.totalGeneral;
    encaisse += f.montantPaye;
    enAttente += t.resteAPayer;
  }
  const [devisCount, facturesCount, clientsCount] = await Promise.all([
    prisma.devis.count(),
    prisma.facture.count(),
    prisma.clientFacturation.count(),
  ]);
  return { facture, encaisse, enAttente, devisCount, facturesCount, clientsCount };
}
