import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  ALLOWED_ARCHIVE_CONTENT_TYPES,
  MAX_ARCHIVE_BYTES,
  hasBlobStorage,
} from "@/lib/archive-storage";
import { requireApiAuth, unauthorizedResponse } from "@/lib/api-auth";
import { canWrite } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasBlobStorage()) {
    return NextResponse.json(
      {
        error:
          "Stockage Blob non configuré (BLOB_READ_WRITE_TOKEN manquant).",
      },
      { status: 503 }
    );
  }

  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();
  if (!canWrite(session.role)) {
    return NextResponse.json(
      { error: "Accès refusé : profil en lecture seule." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // clientPayload = JSON with entity ids : validated later at register
        if (clientPayload) {
          try {
            JSON.parse(clientPayload);
          } catch {
            throw new Error("Payload client invalide.");
          }
        }
        return {
          allowedContentTypes: ALLOWED_ARCHIVE_CONTENT_TYPES,
          maximumSizeInBytes: MAX_ARCHIVE_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId: session.id,
            userNom: session.nom,
            clientPayload,
          }),
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec token Blob.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
