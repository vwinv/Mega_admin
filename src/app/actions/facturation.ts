"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import {
  approvalFieldsForFacture,
  computeTotauxFacture,
  detailsToJson,
  nextNumeroDevis,
  nextNumeroFacture,
  normalizeRemisePourcent,
  parseDetailsJson,
  type LigneDoc,
} from "@/lib/facturation";
import { ensureCaisseMirrorFromJournal, isCashMode } from "@/lib/cash-sync";
import { ensureNumeroFactureUnique, nextNumeroPieceBanque } from "@/lib/numero-piece";
import { prisma } from "@/lib/prisma";
import { canApproveCeo } from "@/lib/roles";
import { syncSignatureForFacture } from "@/lib/signatures";

const PATHS = [
  "/facturation",
  "/facturation/recus",
  "/clients",
  "/journal",
  "/caisse",
  "/tresorerie",
  "/impots",
  "/approbations",
  "/signatures",
  "/finance",
  "/",
];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

async function allocateNumeroFacture(): Promise<string> {
  return nextNumeroFacture(async () => {
    const rows = await prisma.facture.findMany({ select: { numero: true } });
    return rows.map((r) => r.numero);
  });
}

export type ClientRow = {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
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

export type FactureOrigineOption = {
  id: string;
  numero: string;
  titre: string | null;
  date: string;
  resteAPayer: number;
  statut: string;
};

export type FactureDossierRow = {
  id: string;
  numero: string;
  titre: string | null;
  date: string;
  statut: string;
  totalGeneral: number;
  montantPaye: number;
  resteAPayer: number;
  factureOrigineId: string | null;
};

function totauxFromFactureRecord(f: {
  lignes: { prix: number }[];
  reliquat: number;
  tauxTVA: number;
  montantPaye: number;
  remiseMontant: number;
  remisePourcent: number;
}) {
  return computeTotauxFacture(
    f.lignes,
    f.reliquat,
    f.tauxTVA,
    f.montantPaye,
    f.remiseMontant,
    f.remisePourcent
  );
}

async function validateFactureOrigine(
  factureId: string | undefined,
  factureOrigineId: string | null,
  clientId: string
): Promise<string | null> {
  if (!factureOrigineId) return null;
  if (factureId && factureOrigineId === factureId) {
    return "Une facture ne peut pas être sa propre origine.";
  }
  const origin = await prisma.facture.findUnique({
    where: { id: factureOrigineId },
    select: { id: true, clientId: true, factureOrigineId: true },
  });
  if (!origin) return "Facture d'origine introuvable.";
  if (origin.clientId !== clientId) {
    return "La facture d'origine doit être du même client.";
  }
  let cur: string | null = origin.factureOrigineId;
  while (cur) {
    if (factureId && cur === factureId) {
      return "Lien circulaire entre factures interdit.";
    }
    const p = await prisma.facture.findUnique({
      where: { id: cur },
      select: { factureOrigineId: true },
    });
    cur = p?.factureOrigineId ?? null;
  }
  return null;
}

async function getFactureDossier(factureId: string): Promise<FactureDossierRow[]> {
  const current = await prisma.facture.findUnique({
    where: { id: factureId },
    select: { id: true, factureOrigineId: true },
  });
  if (!current) return [];

  let rootId = factureId;
  let walkId: string | null = factureId;
  while (walkId) {
    const row: { id: string; factureOrigineId: string | null } | null =
      await prisma.facture.findUnique({
        where: { id: walkId },
        select: { id: true, factureOrigineId: true },
      });
    if (!row) break;
    rootId = row.id;
    walkId = row.factureOrigineId;
  }

  const collected = new Map<string, FactureDossierRow>();

  async function collectTree(id: string) {
    const f = await prisma.facture.findUnique({
      where: { id },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    });
    if (!f || collected.has(f.id)) return;
    const totaux = totauxFromFactureRecord(f);
    collected.set(f.id, {
      id: f.id,
      numero: f.numero,
      titre: f.titre,
      date: f.date.toISOString(),
      statut: f.statut,
      totalGeneral: totaux.totalGeneral,
      montantPaye: f.montantPaye,
      resteAPayer: totaux.resteAPayer,
      factureOrigineId: f.factureOrigineId,
    });
    const children = await prisma.facture.findMany({
      where: { factureOrigineId: id },
      select: { id: true },
      orderBy: [{ date: "asc" }, { numero: "asc" }],
    });
    for (const c of children) await collectTree(c.id);
  }

  await collectTree(rootId);
  return [...collected.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export async function listFacturesOriginePossibles(
  clientId: string,
  excludeFactureId?: string
): Promise<FactureOrigineOption[]> {
  if (!clientId) return [];
  const rows = await prisma.facture.findMany({
    where: {
      clientId,
      ...(excludeFactureId ? { id: { not: excludeFactureId } } : {}),
    },
    include: { lignes: true },
    orderBy: [{ date: "desc" }, { numero: "desc" }],
  });
  return rows.map((f) => {
    const totaux = totauxFromFactureRecord(f);
    return {
      id: f.id,
      numero: f.numero,
      titre: f.titre,
      date: f.date.toISOString(),
      resteAPayer: totaux.resteAPayer,
      statut: f.statut,
    };
  });
}

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
    adresse: c.adresse,
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

export async function updateClient(
  id: string,
  input: {
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;
  if (!input.nom.trim()) return { ok: false, error: "Le nom du client est obligatoire." };

  const existing = await prisma.clientFacturation.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Client introuvable." };

  const c = await prisma.clientFacturation.update({
    where: { id },
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
    action: "UPDATE",
    entity: "Client",
    entityId: c.id,
    details: c.nom,
  });

  revalidate();
  return { ok: true };
}

export async function deleteClient(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const existing = await prisma.clientFacturation.findUnique({
    where: { id },
    include: {
      _count: { select: { devis: true, factures: true } },
    },
  });
  if (!existing) return { ok: false, error: "Client introuvable." };

  const used = existing._count.devis + existing._count.factures;
  if (used > 0) {
    return {
      ok: false,
      error:
        "Ce client a des devis ou factures liés et ne peut pas être supprimé.",
    };
  }

  await prisma.clientFacturation.delete({ where: { id } });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "Client",
    entityId: id,
    details: existing.nom,
  });

  revalidate();
  return { ok: true };
}

export async function listDevis(): Promise<DevisRow[]> {
  const rows = await prisma.devis.findMany({
    include: { client: true, lignes: true, facture: { select: { id: true } } },
    orderBy: { date: "desc" },
  });
  return rows.map((d) => {
    const totaux = computeTotauxFacture(
      d.lignes,
      d.reliquat,
      d.tauxTVA,
      0,
      d.remiseMontant,
      d.remisePourcent
    );
    return {
      id: d.id,
      numero: d.numero,
      titre: d.titre,
      date: d.date.toISOString(),
      statut: d.statut,
      clientNom: d.client.nom,
      clientId: d.clientId,
      totalHT: totaux.totalHT,
      hasFacture: !!d.facture,
    };
  });
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
      f.montantPaye,
      f.remiseMontant,
      f.remisePourcent
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
    reliquat: d.reliquat,
    reliquatLabel: d.reliquatLabel,
    remiseMontant: d.remiseMontant,
    remisePourcent: d.remisePourcent,
    tauxTVA: d.tauxTVA,
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
    totalHT: computeTotauxFacture(
      d.lignes,
      d.reliquat,
      d.tauxTVA,
      0,
      d.remiseMontant,
      d.remisePourcent
    ).totalHT,
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
      factureOrigine: {
        select: {
          id: true,
          numero: true,
          titre: true,
          date: true,
          statut: true,
          reliquat: true,
          tauxTVA: true,
          montantPaye: true,
          remiseMontant: true,
          remisePourcent: true,
          lignes: true,
        },
      },
    },
  });
  if (!f) return null;
  const params = await prisma.parametre.findFirst();
  const totaux = computeTotauxFacture(
    f.lignes,
    f.reliquat,
    f.tauxTVA,
    f.montantPaye,
    f.remiseMontant,
    f.remisePourcent
  );
  const factureOrigine = f.factureOrigine
    ? {
        id: f.factureOrigine.id,
        numero: f.factureOrigine.numero,
        titre: f.factureOrigine.titre,
        resteAPayer: totauxFromFactureRecord(f.factureOrigine).resteAPayer,
      }
    : null;
  const dossier = await getFactureDossier(id);
  return {
    id: f.id,
    numero: f.numero,
    titre: f.titre,
    date: f.date.toISOString(),
    statut: f.statut,
    notes: f.notes,
    reliquat: f.reliquat,
    reliquatLabel: f.reliquatLabel,
    remiseMontant: f.remiseMontant,
    remisePourcent: f.remisePourcent,
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
    factureOrigineId: f.factureOrigineId,
    factureOrigine,
    dossier,
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
    reliquat?: number;
    reliquatLabel?: string;
    remiseMontant?: number;
    remisePourcent?: number;
    tauxTVA?: number;
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

  const reliquat = Math.max(0, Math.round(input.reliquat ?? 0) || 0);
  const reliquatLabel = input.reliquatLabel?.trim() || "Reliquat";
  const remisePourcent = normalizeRemisePourcent(Number(input.remisePourcent ?? 0) || 0);
  const remiseMontant =
    remisePourcent > 0
      ? 0
      : Math.max(0, Math.round(input.remiseMontant ?? 0) || 0);
  const tauxTVA = Math.max(0, Number(input.tauxTVA ?? 0) || 0);

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
        reliquat,
        reliquatLabel,
        remiseMontant,
        remisePourcent,
        tauxTVA,
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
      reliquat,
      reliquatLabel,
      remiseMontant,
      remisePourcent,
      tauxTVA,
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
    remiseMontant?: number;
    remisePourcent?: number;
    tauxTVA?: number;
    notes?: string;
    factureOrigineId?: string | null;
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
  const tauxDefaut = params?.tauxTVA ?? 0.18;
  const tauxTVA =
    input.tauxTVA === undefined
      ? tauxDefaut
      : Math.max(0, Number(input.tauxTVA) || 0);
  const remisePourcent = normalizeRemisePourcent(
    Number(input.remisePourcent ?? 0) || 0
  );
  const remiseMontant =
    remisePourcent > 0
      ? 0
      : Math.max(0, Math.round(input.remiseMontant ?? 0) || 0);
  const reliquat = Math.max(0, Math.round(input.reliquat ?? 0) || 0);
  const reliquatLabel = input.reliquatLabel?.trim() || "Reliquat";
  const factureOrigineId = input.factureOrigineId?.trim() || null;
  const origineErr = await validateFactureOrigine(
    input.id,
    factureOrigineId,
    input.clientId
  );
  if (origineErr) return { ok: false, error: origineErr };

  const lignesData = input.lignes.map((l, i) => ({
    ordre: i,
    designation: l.designation.trim(),
    details: detailsToJson(l.details),
    prix: l.prix,
    styleAccent: l.styleAccent,
  }));

  const statutFinal = input.statut ?? "BROUILLON";
  const autoApprove = canApproveCeo(guard.role);

  if (input.id) {
    const existing = await prisma.facture.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false, error: "Facture introuvable." };

    const approval = approvalFieldsForFacture(
      statutFinal,
      guard.nom,
      {
        statut: existing.statut,
        statutApprobation: existing.statutApprobation,
      },
      { autoApprove }
    );

    await prisma.factureLigne.deleteMany({ where: { factureId: input.id } });
    await prisma.facture.update({
      where: { id: input.id },
      data: {
        titre: input.titre?.trim() || null,
        date: parseDate(input.date),
        clientId: input.clientId,
        statut: statutFinal,
        reliquat,
        reliquatLabel,
        factureOrigineId,
        remiseMontant,
        remisePourcent,
        notes: input.notes?.trim() || null,
        tauxTVA,
        ...approval,
        lignes: { create: lignesData },
      },
    });
    await syncSignatureForFacture(input.id, {
      id: guard.id,
      nom: guard.nom,
    });
    revalidate();
    return { ok: true, id: input.id };
  }

  const numero = await allocateNumeroFacture();
  const numeroErr = await ensureNumeroFactureUnique(prisma, numero);
  if (numeroErr) return { ok: false, error: numeroErr };

  const approval = approvalFieldsForFacture(statutFinal, guard.nom, undefined, {
    autoApprove,
  });
  const created = await prisma.facture.create({
    data: {
      numero,
      titre: input.titre?.trim() || null,
      date: parseDate(input.date),
      clientId: input.clientId,
      statut: statutFinal,
      reliquat,
      reliquatLabel,
      factureOrigineId,
      remiseMontant,
      remisePourcent,
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

  await syncSignatureForFacture(created.id, {
    id: guard.id,
    nom: guard.nom,
  });

  revalidate();
  return { ok: true, id: created.id };
}

export async function convertirDevisEnFacture(
  devisId: string
): Promise<{ ok: true; factureId: string } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { lignes: true, facture: true },
  });
  if (!devis) return { ok: false, error: "Devis introuvable." };
  if (devis.facture) return { ok: false, error: "Ce devis est déjà facturé." };

  const numero = await allocateNumeroFacture();
  const numeroErr = await ensureNumeroFactureUnique(prisma, numero);
  if (numeroErr) return { ok: false, error: numeroErr };

  const approval = approvalFieldsForFacture(
    "ENVOYE",
    guard.nom,
    undefined,
    { autoApprove: canApproveCeo(guard.role) }
  );

  const facture = await prisma.facture.create({
    data: {
      numero,
      titre: devis.titre,
      date: new Date(),
      clientId: devis.clientId,
      devisId: devis.id,
      statut: "ENVOYE",
      reliquat: devis.reliquat,
      reliquatLabel: devis.reliquatLabel || "Reliquat",
      remiseMontant: devis.remiseMontant,
      remisePourcent: devis.remisePourcent,
      tauxTVA: devis.tauxTVA,
      ...approval,
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

  await syncSignatureForFacture(facture.id, {
    id: guard.id,
    nom: guard.nom,
  });

  revalidate();
  return { ok: true, factureId: facture.id };
}

export async function enregistrerPaiementFacture(
  factureId: string,
  montant: number,
  datePaiement?: string,
  modePaiement?: string
): Promise<
  { ok: true; operationId: string } | { ok: false; error: string }
> {
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
    facture.montantPaye,
    facture.remiseMontant,
    facture.remisePourcent
  );

  if (montant <= 0) return { ok: false, error: "Montant invalide." };
  if (montant > totaux.resteAPayer) {
    return { ok: false, error: "Le montant dépasse le reste à payer." };
  }

  const catEntree = await prisma.categorie.findFirst({
    where: { sens: "entree" },
    orderBy: { nom: "asc" },
  });
  if (!catEntree) {
    return {
      ok: false,
      error:
        "Aucune catégorie d'entrée configurée. Créez-en une dans le plan comptable.",
    };
  }

  const nouveauPaye = facture.montantPaye + montant;
  const totauxApres = computeTotauxFacture(
    facture.lignes,
    facture.reliquat,
    facture.tauxTVA,
    nouveauPaye,
    facture.remiseMontant,
    facture.remisePourcent
  );
  const statut =
    totauxApres.resteAPayer === 0
      ? "PAYE"
      : nouveauPaye > 0
        ? "PARTIEL"
        : facture.statut;

  const payDate = datePaiement ? parseDate(datePaiement) : new Date();
  const trancheN =
    (await prisma.operation.count({ where: { factureId } })) + 1;
  const numeroPiece = await nextNumeroPieceBanque(prisma, payDate);

  const op = await prisma.operation.create({
    data: {
      date: payDate,
      libelle: `Facture ${facture.numero} · tranche ${trancheN} · ${facture.client.nom}`,
      categorieId: catEntree.id,
      entree: montant,
      sortie: null,
      numeroPiece,
      modePaiement: modePaiement?.trim() || null,
      factureId,
      statutApprobation: "APPROUVE",
      validePar: guard.nom,
      observations:
        totauxApres.resteAPayer > 0
          ? `Paiement partiel (tranche ${trancheN}) · Facture ${facture.numero} · reste ${totauxApres.resteAPayer.toLocaleString("fr-FR")} FCFA`
          : `Paiement soldé (tranche ${trancheN}) · Facture ${facture.numero}`,
      historique: false,
    },
  });

  if (isCashMode(modePaiement)) {
    await ensureCaisseMirrorFromJournal(op.id);
  }

  await prisma.facture.update({
    where: { id: factureId },
    data: {
      montantPaye: nouveauPaye,
      datePaiement: payDate,
      statut,
      operationId: facture.operationId ?? op.id,
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "Facture",
    entityId: factureId,
    details: `Tranche ${trancheN} · ${montant.toLocaleString("fr-FR")} FCFA · ${facture.numero}`,
  });

  revalidate();
  revalidatePath(`/facturation/factures/${factureId}`);
  return { ok: true, operationId: op.id };
}

export type PaiementTrancheRow = {
  id: string;
  tranche: number;
  date: string;
  montant: number;
  numeroPiece: string | null;
  modePaiement: string | null;
  libelle: string;
};

export async function listPaiementsFacture(
  factureId: string
): Promise<PaiementTrancheRow[]> {
  const rows = await prisma.operation.findMany({
    where: { factureId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((op, i) => ({
    id: op.id,
    tranche: i + 1,
    date: (op.date ?? op.createdAt).toISOString(),
    montant: op.entree ?? 0,
    numeroPiece: op.numeroPiece,
    modePaiement: op.modePaiement,
    libelle: op.libelle,
  }));
}

export async function getRecuPaiement(operationId: string) {
  const op = await prisma.operation.findUnique({
    where: { id: operationId },
    include: {
      facture: {
        include: {
          client: true,
          lignes: true,
        },
      },
    },
  });
  if (!op?.facture) return null;

  const facture = op.facture;
  const totaux = computeTotauxFacture(
    facture.lignes,
    facture.reliquat,
    facture.tauxTVA,
    facture.montantPaye,
    facture.remiseMontant,
    facture.remisePourcent
  );

  const paiements = await prisma.operation.findMany({
    where: { factureId: facture.id },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const tranche = paiements.findIndex((p) => p.id === op.id) + 1;
  const params = await prisma.parametre.findFirst();

  return {
    operationId: op.id,
    tranche,
    totalTranches: paiements.length,
    date: (op.date ?? op.createdAt).toISOString(),
    montant: op.entree ?? 0,
    numeroPiece: op.numeroPiece,
    modePaiement: op.modePaiement,
    libelle: op.libelle,
    validePar: op.validePar,
    facture: {
      id: facture.id,
      numero: facture.numero,
      titre: facture.titre,
      date: facture.date.toISOString(),
      statut: facture.statut,
      clientNom: facture.client.nom,
      clientAdresse: facture.client.adresse,
      clientTelephone: facture.client.telephone,
      clientEmail: facture.client.email,
    },
    totaux: {
      totalGeneral: totaux.totalGeneral,
      montantPaye: facture.montantPaye,
      resteAPayer: totaux.resteAPayer,
    },
    entreprise: params,
    historique: op.historique,
  };
}

export type RecuListRow = {
  id: string;
  tranche: number;
  totalTranches: number;
  date: string;
  montant: number;
  numeroPiece: string | null;
  modePaiement: string | null;
  historique: boolean;
  factureId: string;
  factureNumero: string;
  factureTitre: string | null;
  clientNom: string;
  factureStatut: string;
};

export async function listRecusPaiement(): Promise<RecuListRow[]> {
  const rows = await prisma.operation.findMany({
    where: {
      factureId: { not: null },
      entree: { gt: 0 },
    },
    include: {
      facture: {
        include: { client: true },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const byFacture = new Map<string, typeof rows>();
  for (const op of rows) {
    if (!op.factureId) continue;
    const list = byFacture.get(op.factureId) ?? [];
    list.push(op);
    byFacture.set(op.factureId, list);
  }

  const trancheMap = new Map<string, { tranche: number; total: number }>();
  for (const ops of byFacture.values()) {
    const sorted = [...ops].sort((a, b) => {
      const da = (a.date ?? a.createdAt).getTime();
      const db = (b.date ?? b.createdAt).getTime();
      if (da !== db) return da - db;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    sorted.forEach((op, i) => {
      trancheMap.set(op.id, { tranche: i + 1, total: sorted.length });
    });
  }

  return rows.map((op) => {
    const facture = op.facture!;
    const t = trancheMap.get(op.id) ?? { tranche: 1, total: 1 };
    return {
      id: op.id,
      tranche: t.tranche,
      totalTranches: t.total,
      date: (op.date ?? op.createdAt).toISOString(),
      montant: op.entree ?? 0,
      numeroPiece: op.numeroPiece,
      modePaiement: op.modePaiement,
      historique: op.historique,
      factureId: facture.id,
      factureNumero: facture.numero,
      factureTitre: facture.titre,
      clientNom: facture.client.nom,
      factureStatut: facture.statut,
    };
  });
}

export type FactureRecuOption = {
  id: string;
  numero: string;
  titre: string | null;
  clientNom: string;
  montantPaye: number;
  totalGeneral: number;
  resteAPayer: number;
  nbRecus: number;
};

/** Factures éligibles pour créer un reçu (paiement antérieur). */
export async function listFacturesPourRecu(): Promise<FactureRecuOption[]> {
  const rows = await prisma.facture.findMany({
    include: {
      client: true,
      lignes: true,
      operations: {
        where: { entree: { gt: 0 } },
        select: { id: true, entree: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return rows.map((f) => {
    const totaux = computeTotauxFacture(
      f.lignes,
      f.reliquat,
      f.tauxTVA,
      f.montantPaye,
      f.remiseMontant,
      f.remisePourcent
    );
    const totalRecus = f.operations.reduce((s, o) => s + (o.entree ?? 0), 0);
    return {
      id: f.id,
      numero: f.numero,
      titre: f.titre,
      clientNom: f.client.nom,
      montantPaye: f.montantPaye,
      totalGeneral: totaux.totalGeneral,
      resteAPayer: totaux.resteAPayer,
      nbRecus: f.operations.length,
    };
  });
}

/**
 * Reçu pour un paiement antérieur au site : document imprimable sans
 * nouvelle écriture de trésorerie.
 */
export async function creerRecuHistorique(input: {
  factureId: string;
  montant: number;
  datePaiement: string;
  modePaiement?: string;
  numeroPiece?: string;
  observations?: string;
  /** Met à jour montantPaye / statut facture (si pas encore synchronisé). */
  ajusterMontantPaye?: boolean;
}): Promise<
  { ok: true; operationId: string } | { ok: false; error: string }
> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const facture = await prisma.facture.findUnique({
    where: { id: input.factureId },
    include: { client: true, lignes: true },
  });
  if (!facture) return { ok: false, error: "Facture introuvable." };

  const montant = Math.round(input.montant);
  if (montant <= 0) return { ok: false, error: "Montant invalide." };

  const totaux = computeTotauxFacture(
    facture.lignes,
    facture.reliquat,
    facture.tauxTVA,
    facture.montantPaye,
    facture.remiseMontant,
    facture.remisePourcent
  );

  const opsExistants = await prisma.operation.findMany({
    where: { factureId: input.factureId, entree: { gt: 0 } },
    select: { entree: true },
  });
  const totalRecus = opsExistants.reduce((s, o) => s + (o.entree ?? 0), 0);
  const totalApres = totalRecus + montant;

  if (totalApres > totaux.totalGeneral) {
    return {
      ok: false,
      error: `Le total des reçus (${totalApres.toLocaleString("fr-FR")} FCFA) dépasserait le total de la facture (${totaux.totalGeneral.toLocaleString("fr-FR")} FCFA).`,
    };
  }

  if (!input.ajusterMontantPaye && totalApres > facture.montantPaye) {
    return {
      ok: false,
      error: `Ce reçu ferait ${totalApres.toLocaleString("fr-FR")} FCFA de reçus, mais la facture n'indique que ${facture.montantPaye.toLocaleString("fr-FR")} FCFA payés. Cochez « Mettre à jour le montant payé » ou ajustez la facture.`,
    };
  }

  const catEntree = await prisma.categorie.findFirst({
    where: { sens: "entree" },
    orderBy: { nom: "asc" },
  });
  if (!catEntree) {
    return {
      ok: false,
      error:
        "Aucune catégorie d'entrée configurée. Créez-en une dans le plan comptable.",
    };
  }

  const payDate = parseDate(input.datePaiement);
  const trancheN =
    (await prisma.operation.count({ where: { factureId: input.factureId } })) + 1;
  const numeroPiece =
    input.numeroPiece?.trim() ||
    (await nextNumeroPieceBanque(prisma, payDate));

  const op = await prisma.operation.create({
    data: {
      date: payDate,
      libelle: `Facture ${facture.numero} · tranche ${trancheN} (antérieur) · ${facture.client.nom}`,
      categorieId: catEntree.id,
      entree: montant,
      sortie: null,
      numeroPiece,
      modePaiement: input.modePaiement?.trim() || null,
      factureId: input.factureId,
      statutApprobation: "APPROUVE",
      validePar: guard.nom,
      historique: true,
      observations:
        input.observations?.trim() ||
        "Paiement antérieur à la mise en service · reçu de régularisation (sans impact trésorerie)",
    },
  });

  if (input.ajusterMontantPaye) {
    const nouveauPaye = totalApres;
    const totauxApres = computeTotauxFacture(
      facture.lignes,
      facture.reliquat,
      facture.tauxTVA,
      nouveauPaye,
      facture.remiseMontant,
      facture.remisePourcent
    );
    const statut =
      totauxApres.resteAPayer === 0
        ? "PAYE"
        : nouveauPaye > 0
          ? "PARTIEL"
          : facture.statut;

    await prisma.facture.update({
      where: { id: input.factureId },
      data: {
        montantPaye: nouveauPaye,
        datePaiement: payDate,
        statut,
        operationId: facture.operationId ?? op.id,
      },
    });
  }

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "Operation",
    entityId: op.id,
    details: `Reçu antérieur · ${montant.toLocaleString("fr-FR")} FCFA · ${facture.numero}`,
  });

  revalidate();
  revalidatePath(`/facturation/recus`);
  revalidatePath(`/facturation/factures/${input.factureId}`);
  return { ok: true, operationId: op.id };
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
    const t = computeTotauxFacture(
      f.lignes,
      f.reliquat,
      f.tauxTVA,
      f.montantPaye,
      f.remiseMontant,
      f.remisePourcent
    );
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
