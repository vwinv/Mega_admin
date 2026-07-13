"use server";

import { revalidatePath } from "next/cache";
import { deleteArchiveFile, saveArchiveFile } from "@/lib/archive-storage";
import { guardWrite, isGuardError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export type PieceComptableRow = {
  id: string;
  nomOriginal: string;
  mimeType: string | null;
  tailleOctets: number | null;
  typeDocument: string;
  libelle: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

export type ArchiveSource = "facture" | "journal" | "caisse";

export type ArchiveItem = {
  id: string;
  nomOriginal: string;
  mimeType: string | null;
  tailleOctets: number | null;
  typeDocument: string;
  libelle: string | null;
  uploadedBy: string | null;
  createdAt: string;
  /** Date métier (facture / opération) */
  dateDocument: string | null;
  source: ArchiveSource;
  reference: string;
  titre: string;
  hrefParent: string;
  downloadHref: string;
};

export type FactureArchiveRow = {
  id: string;
  numero: string;
  client: string;
  date: string;
  statut: string;
  totalTTC: number;
  nbPieces: number;
  href: string;
};

function toRow(p: {
  id: string;
  nomOriginal: string;
  mimeType: string | null;
  tailleOctets: number | null;
  typeDocument: string;
  libelle: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}): PieceComptableRow {
  return {
    id: p.id,
    nomOriginal: p.nomOriginal,
    mimeType: p.mimeType,
    tailleOctets: p.tailleOctets,
    typeDocument: p.typeDocument,
    libelle: p.libelle,
    uploadedBy: p.uploadedBy,
    createdAt: p.createdAt.toISOString(),
  };
}

function revalidateArchives(piece: {
  factureId?: string | null;
  operationId?: string | null;
  operationCaisseId?: string | null;
}) {
  revalidatePath("/archives");
  if (piece.factureId) {
    revalidatePath(`/facturation/factures/${piece.factureId}`);
    revalidatePath("/facturation");
  }
  if (piece.operationId) revalidatePath("/journal");
  if (piece.operationCaisseId) revalidatePath("/caisse");
}

export async function listPiecesFacture(
  factureId: string
): Promise<PieceComptableRow[]> {
  const rows = await prisma.pieceComptable.findMany({
    where: { factureId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

export async function listPiecesOperation(
  operationId: string
): Promise<PieceComptableRow[]> {
  const rows = await prisma.pieceComptable.findMany({
    where: { operationId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

export async function listPiecesCaisse(
  operationCaisseId: string
): Promise<PieceComptableRow[]> {
  const rows = await prisma.pieceComptable.findMany({
    where: { operationCaisseId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

export async function listArchives(filters?: {
  annee?: number;
  mois?: number;
  source?: ArchiveSource | "";
  typeDocument?: string;
  q?: string;
}): Promise<ArchiveItem[]> {
  const rows = await prisma.pieceComptable.findMany({
    include: {
      facture: { include: { client: true } },
      operation: true,
      operationCaisse: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const q = (filters?.q ?? "").trim().toLowerCase();
  const items: ArchiveItem[] = [];

  for (const p of rows) {
    let source: ArchiveSource;
    let dateDocument: Date | null = null;
    let reference: string;
    let titre: string;
    let hrefParent: string;

    if (p.factureId && p.facture) {
      source = "facture";
      dateDocument = p.facture.date;
      reference = p.facture.numero;
      titre = p.facture.client.nom;
      hrefParent = `/facturation/factures/${p.facture.id}`;
    } else if (p.operationId && p.operation) {
      source = "journal";
      dateDocument = p.operation.date;
      reference = p.operation.numeroPiece || p.operation.id.slice(0, 8);
      titre = p.operation.libelle;
      hrefParent = `/journal?op=${p.operation.id}`;
    } else if (p.operationCaisseId && p.operationCaisse) {
      source = "caisse";
      dateDocument = p.operationCaisse.date;
      reference =
        p.operationCaisse.numeroPiece || p.operationCaisse.id.slice(0, 8);
      titre = p.operationCaisse.libelle;
      hrefParent = `/caisse?op=${p.operationCaisse.id}`;
    } else {
      continue;
    }

    if (filters?.source && filters.source !== source) continue;

    if (filters?.typeDocument && p.typeDocument !== filters.typeDocument) {
      continue;
    }

    if (filters?.annee) {
      const y = (dateDocument ?? p.createdAt).getUTCFullYear();
      if (y !== filters.annee) continue;
    }

    if (filters?.mois) {
      const m = (dateDocument ?? p.createdAt).getUTCMonth() + 1;
      if (m !== filters.mois) continue;
    }

    if (q) {
      const hay = [
        p.nomOriginal,
        p.libelle ?? "",
        reference,
        titre,
        p.typeDocument,
        p.uploadedBy ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    items.push({
      id: p.id,
      nomOriginal: p.nomOriginal,
      mimeType: p.mimeType,
      tailleOctets: p.tailleOctets,
      typeDocument: p.typeDocument,
      libelle: p.libelle,
      uploadedBy: p.uploadedBy,
      createdAt: p.createdAt.toISOString(),
      dateDocument: dateDocument?.toISOString() ?? null,
      source,
      reference,
      titre,
      hrefParent,
      downloadHref: `/api/pieces/${p.id}`,
    });
  }

  items.sort((a, b) => {
    const da = a.dateDocument ?? a.createdAt;
    const db = b.dateDocument ?? b.createdAt;
    return db.localeCompare(da);
  });

  return items;
}

export async function listFacturesArchives(): Promise<FactureArchiveRow[]> {
  const { computeTotauxFacture } = await import("@/lib/facturation");
  const rows = await prisma.facture.findMany({
    include: {
      client: true,
      lignes: { select: { prix: true } },
      _count: { select: { piecesComptables: true } },
    },
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
      client: f.client.nom,
      date: f.date.toISOString(),
      statut: f.statut,
      totalTTC: totaux.totalTTC,
      nbPieces: f._count.piecesComptables,
      href: `/facturation/factures/${f.id}`,
    };
  });
}

export async function getArchivesStats() {
  const [total, parFacture, parJournal, parCaisse, facturesSansPiece] =
    await Promise.all([
      prisma.pieceComptable.count(),
      prisma.pieceComptable.count({ where: { factureId: { not: null } } }),
      prisma.pieceComptable.count({ where: { operationId: { not: null } } }),
      prisma.pieceComptable.count({
        where: { operationCaisseId: { not: null } },
      }),
      prisma.facture.count({
        where: {
          statut: { notIn: ["BROUILLON", "ANNULE"] },
          piecesComptables: { none: {} },
        },
      }),
    ]);

  return {
    total,
    parFacture,
    parJournal,
    parCaisse,
    facturesSansPiece,
  };
}

export async function uploadPieceComptable(
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const factureId = String(formData.get("factureId") ?? "").trim() || null;
  const operationId = String(formData.get("operationId") ?? "").trim() || null;
  const operationCaisseId =
    String(formData.get("operationCaisseId") ?? "").trim() || null;
  const file = formData.get("file");
  const libelle = String(formData.get("libelle") ?? "").trim() || null;
  const typeDocument = String(formData.get("typeDocument") ?? "JUSTIFICATIF");

  const linked = [factureId, operationId, operationCaisseId].filter(Boolean);
  if (linked.length !== 1) {
    return {
      ok: false,
      error: "Document non rattaché à une écriture ou facture.",
    };
  }
  if (!(file instanceof File)) return { ok: false, error: "Fichier requis." };

  try {
    const subdir = factureId
      ? `factures/${factureId}`
      : operationId
        ? `operations/${operationId}`
        : `caisse/${operationCaisseId}`;
    const stored = await saveArchiveFile(file, subdir);

    if (factureId) {
      const facture = await prisma.facture.findUnique({
        where: { id: factureId },
      });
      if (!facture) return { ok: false, error: "Facture introuvable." };
    }
    if (operationId) {
      const op = await prisma.operation.findUnique({
        where: { id: operationId },
      });
      if (!op) return { ok: false, error: "Opération introuvable." };
    }
    if (operationCaisseId) {
      const op = await prisma.operationCaisse.findUnique({
        where: { id: operationCaisseId },
      });
      if (!op) return { ok: false, error: "Opération caisse introuvable." };
    }

    const piece = await prisma.pieceComptable.create({
      data: {
        nomOriginal: file.name,
        cheminStockage: stored.cheminStockage,
        mimeType: stored.mimeType,
        tailleOctets: stored.tailleOctets,
        typeDocument: factureId ? "FACTURE" : typeDocument,
        libelle,
        factureId,
        operationId,
        operationCaisseId,
        uploadedBy: guard.nom,
      },
    });

    await logAudit({
      userId: guard.id,
      userNom: guard.nom,
      action: "CREATE",
      entity: "PieceComptable",
      entityId: piece.id,
      details: file.name,
    });

    revalidateArchives({ factureId, operationId, operationCaisseId });
    return { ok: true, id: piece.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec de l'upload.",
    };
  }
}

/** @deprecated Utiliser uploadPieceComptable */
export async function uploadPieceFacture(
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  return uploadPieceComptable(formData);
}

export async function deletePieceComptable(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardWrite();
  if (isGuardError(guard)) return guard;

  const piece = await prisma.pieceComptable.findUnique({ where: { id } });
  if (!piece) return { ok: false, error: "Pièce introuvable." };

  await deleteArchiveFile(piece.cheminStockage);
  await prisma.pieceComptable.delete({ where: { id } });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "PieceComptable",
    entityId: id,
    details: piece.nomOriginal,
  });

  revalidateArchives(piece);
  return { ok: true };
}
