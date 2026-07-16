import { upload } from "@vercel/blob/client";
import { uploadPieceComptable } from "@/app/actions/pieces-comptables";
import { buildBlobPathname } from "@/lib/archive-client";

export type PieceUploadTarget =
  | { factureId: string }
  | { operationId: string }
  | { operationCaisseId: string };

/** Upload une pièce (Blob en prod, fallback Server Action). */
export async function uploadPieceFile(
  file: File,
  target: PieceUploadTarget,
  libelle?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const subdir =
    "factureId" in target
      ? `factures/${target.factureId}`
      : "operationId" in target
        ? `operations/${target.operationId}`
        : `caisse/${target.operationCaisseId}`;

  try {
    const pathname = buildBlobPathname(subdir, file.name);
    const clientPayload = JSON.stringify({
      ...target,
      nomOriginal: file.name,
      libelle: libelle?.trim() || null,
    });

    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/pieces/blob-upload",
      clientPayload,
      multipart: file.size > 1.5 * 1024 * 1024,
      contentType: file.type || undefined,
    });

    const res = await fetch("/api/pieces/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: file.size,
        nomOriginal: file.name,
        libelle: libelle?.trim() || null,
        factureId: "factureId" in target ? target.factureId : null,
        operationId: "operationId" in target ? target.operationId : null,
        operationCaisseId:
          "operationCaisseId" in target ? target.operationCaisseId : null,
      }),
    });

    const data = (await res.json()) as
      | { ok: true; id: string }
      | { ok: false; error: string };

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error:
          !data.ok && "error" in data
            ? data.error
            : `Échec enregistrement (${res.status}).`,
      };
    }
    return data;
  } catch {
    const fd = new FormData();
    if ("factureId" in target) fd.set("factureId", target.factureId);
    if ("operationId" in target) fd.set("operationId", target.operationId);
    if ("operationCaisseId" in target)
      fd.set("operationCaisseId", target.operationCaisseId);
    fd.set("file", file);
    if (libelle?.trim()) fd.set("libelle", libelle.trim());
    return uploadPieceComptable(fd);
  }
}
