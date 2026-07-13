import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import {
  isDbArchivePath,
  resolveArchivePath,
} from "@/lib/archive-storage";
import { requireApiAuth, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    let body: Uint8Array;
    if (piece.contenu && piece.contenu.length > 0) {
      body = piece.contenu;
    } else if (isDbArchivePath(piece.cheminStockage)) {
      return NextResponse.json(
        { error: "Fichier absent du stockage." },
        { status: 404 }
      );
    } else {
      const fullPath = resolveArchivePath(piece.cheminStockage);
      body = new Uint8Array(await readFile(fullPath));
    }

    const mime = piece.mimeType ?? "application/octet-stream";

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(piece.nomOriginal)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Fichier absent du stockage." },
      { status: 404 }
    );
  }
}
