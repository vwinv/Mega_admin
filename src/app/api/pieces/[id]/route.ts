import { NextRequest, NextResponse } from "next/server";
import {
  isBlobArchivePath,
  isDbArchivePath,
  readArchiveBytes,
} from "@/lib/archive-storage";
import { requireApiAuth, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();

  const { id } = await params;
  const piece = await prisma.pieceComptable.findUnique({ where: { id } });
  if (!piece) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  try {
    if (
      (!piece.contenu || piece.contenu.length === 0) &&
      isDbArchivePath(piece.cheminStockage)
    ) {
      return NextResponse.json(
        { error: "Fichier absent du stockage." },
        { status: 404 }
      );
    }

    const body = await readArchiveBytes(piece.cheminStockage, piece.contenu);
    const mime = piece.mimeType ?? "application/octet-stream";

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(piece.nomOriginal)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("piece download error:", e);
    return NextResponse.json(
      {
        error:
          isBlobArchivePath(piece.cheminStockage)
            ? "Fichier Blob inaccessible."
            : "Fichier absent du stockage.",
      },
      { status: 404 }
    );
  }
}
