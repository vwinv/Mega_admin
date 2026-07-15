import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  blobUrlFromPath,
  isBlobArchivePath,
  validateArchiveFileMeta,
} from "@/lib/archive-storage";
import { requireApiAuth, unauthorizedResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  url: string;
  pathname?: string;
  contentType?: string;
  size?: number;
  nomOriginal: string;
  libelle?: string | null;
  typeDocument?: string;
  factureId?: string | null;
  operationId?: string | null;
  operationCaisseId?: string | null;
};

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

export async function POST(request: NextRequest) {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();
  if (!canWrite(session.role)) {
    return NextResponse.json(
      { ok: false, error: "Accès refusé : profil en lecture seule." },
      { status: 403 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 }
    );
  }

  const url = String(body.url ?? "").trim();
  const nomOriginal = String(body.nomOriginal ?? "").trim();
  if (!url || !isBlobArchivePath(url)) {
    return NextResponse.json(
      { ok: false, error: "URL Blob invalide." },
      { status: 400 }
    );
  }
  if (!nomOriginal) {
    return NextResponse.json(
      { ok: false, error: "Nom de fichier requis." },
      { status: 400 }
    );
  }

  try {
    validateArchiveFileMeta({
      name: nomOriginal,
      size: body.size && body.size > 0 ? body.size : 1,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Fichier invalide." },
      { status: 400 }
    );
  }

  const factureId = body.factureId?.trim() || null;
  const operationId = body.operationId?.trim() || null;
  const operationCaisseId = body.operationCaisseId?.trim() || null;
  const linked = [factureId, operationId, operationCaisseId].filter(Boolean);
  if (linked.length !== 1) {
    return NextResponse.json(
      {
        ok: false,
        error: "Document non rattaché à une écriture ou facture.",
      },
      { status: 400 }
    );
  }

  try {
    if (factureId) {
      const facture = await prisma.facture.findUnique({
        where: { id: factureId },
      });
      if (!facture) {
        return NextResponse.json(
          { ok: false, error: "Facture introuvable." },
          { status: 404 }
        );
      }
    }
    if (operationId) {
      const op = await prisma.operation.findUnique({
        where: { id: operationId },
      });
      if (!op) {
        return NextResponse.json(
          { ok: false, error: "Opération introuvable." },
          { status: 404 }
        );
      }
    }
    if (operationCaisseId) {
      const op = await prisma.operationCaisse.findUnique({
        where: { id: operationCaisseId },
      });
      if (!op) {
        return NextResponse.json(
          { ok: false, error: "Opération caisse introuvable." },
          { status: 404 }
        );
      }
    }

    const piece = await prisma.pieceComptable.create({
      data: {
        nomOriginal,
        cheminStockage: blobUrlFromPath(url).startsWith("http")
          ? url
          : `blob:${url}`,
        mimeType: body.contentType || null,
        tailleOctets: body.size ?? null,
        typeDocument: factureId
          ? "FACTURE"
          : body.typeDocument || "JUSTIFICATIF",
        libelle: body.libelle?.trim() || null,
        factureId,
        operationId,
        operationCaisseId,
        uploadedBy: session.nom,
      },
    });

    await logAudit({
      userId: session.id,
      userNom: session.nom,
      action: "CREATE",
      entity: "PieceComptable",
      entityId: piece.id,
      details: nomOriginal,
    });

    revalidateArchives({ factureId, operationId, operationCaisseId });
    return NextResponse.json({ ok: true, id: piece.id });
  } catch (e) {
    console.error("register piece error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Échec d'enregistrement.",
      },
      { status: 500 }
    );
  }
}
