"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  deletePieceComptable,
  listPiecesCaisse,
  listPiecesFacture,
  listPiecesOperation,
  uploadPieceComptable,
  type PieceComptableRow,
} from "@/app/actions/pieces-comptables";
import {
  buildBlobPathname,
  MAX_ARCHIVE_BYTES,
} from "@/lib/archive-client";
import { formatFileSize } from "@/lib/format";
import { Alert, Button, Card, Input } from "@/components/ui";

type EntityLink =
  | { factureId: string; operationId?: never; operationCaisseId?: never }
  | { operationId: string; factureId?: never; operationCaisseId?: never }
  | { operationCaisseId: string; factureId?: never; operationId?: never };

export function PiecesComptablesPanel({
  pieces,
  canEdit,
  compact = false,
  useBlobUpload = true,
  ...link
}: {
  pieces: PieceComptableRow[];
  canEdit: boolean;
  compact?: boolean;
  /** Upload direct Vercel Blob (requis en prod pour PDF > ~2–3 Mo) */
  useBlobUpload?: boolean;
} & EntityLink) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [libelle, setLibelle] = useState("");
  const [items, setItems] = useState<PieceComptableRow[]>(pieces);
  const [loadingList, setLoadingList] = useState(false);

  const entityKey = link.factureId
    ? `facture-${link.factureId}`
    : link.operationId
      ? `op-${link.operationId}`
      : `caisse-${link.operationCaisseId}`;

  async function reloadPieces() {
    setLoadingList(true);
    try {
      let next: PieceComptableRow[] = [];
      if (link.factureId) next = await listPiecesFacture(link.factureId);
      else if (link.operationId)
        next = await listPiecesOperation(link.operationId);
      else if (link.operationCaisseId)
        next = await listPiecesCaisse(link.operationCaisseId);
      setItems(next);
    } catch {
      // conserve la liste courante
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    setItems(pieces);
    void reloadPieces();
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey]);

  async function uploadViaBlob(file: File): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    const subdir = link.factureId
      ? `factures/${link.factureId}`
      : link.operationId
        ? `operations/${link.operationId}`
        : `caisse/${link.operationCaisseId}`;

    const pathname = buildBlobPathname(subdir, file.name);
    const clientPayload = JSON.stringify({
      factureId: link.factureId ?? null,
      operationId: link.operationId ?? null,
      operationCaisseId: link.operationCaisseId ?? null,
      nomOriginal: file.name,
      libelle: libelle.trim() || null,
    });

    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/pieces/blob-upload",
      clientPayload,
      multipart: file.size > 1.5 * 1024 * 1024,
      contentType: file.type || undefined,
      onUploadProgress: ({ percentage }) => {
        setProgress(Math.round(percentage));
      },
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
        libelle: libelle.trim() || null,
        factureId: link.factureId ?? null,
        operationId: link.operationId ?? null,
        operationCaisseId: link.operationCaisseId ?? null,
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
  }

  async function doUpload(file: File) {
    setError(null);
    setSuccess(null);
    setProgress(null);

    if (file.size > MAX_ARCHIVE_BYTES) {
      setError("Fichier trop volumineux (maximum 15 Mo).");
      return false;
    }

    setUploading(true);
    try {
      let result: { ok: true; id: string } | { ok: false; error: string };

      if (useBlobUpload) {
        try {
          result = await uploadViaBlob(file);
        } catch (blobErr) {
          // Fallback local / si Blob indisponible (dev sans token)
          const msg =
            blobErr instanceof Error ? blobErr.message : String(blobErr);
          if (
            msg.includes("BLOB") ||
            msg.includes("503") ||
            msg.includes("token") ||
            msg.includes("Failed to fetch")
          ) {
            const fd = new FormData();
            if (link.factureId) fd.set("factureId", link.factureId);
            if (link.operationId) fd.set("operationId", link.operationId);
            if (link.operationCaisseId)
              fd.set("operationCaisseId", link.operationCaisseId);
            fd.set("file", file);
            if (libelle.trim()) fd.set("libelle", libelle.trim());
            result = await uploadPieceComptable(fd);
          } else {
            throw blobErr;
          }
        }
      } else {
        const fd = new FormData();
        if (link.factureId) fd.set("factureId", link.factureId);
        if (link.operationId) fd.set("operationId", link.operationId);
        if (link.operationCaisseId)
          fd.set("operationCaisseId", link.operationCaisseId);
        fd.set("file", file);
        if (libelle.trim()) fd.set("libelle", libelle.trim());
        result = await uploadPieceComptable(fd);
      }

      if (!result.ok) {
        setError(result.error);
        return false;
      }

      if (fileRef.current) fileRef.current.value = "";
      setLibelle("");
      setSuccess(`« ${file.name} » bien archivé.`);
      await reloadPieces();
      router.refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Échec de l'upload.";
      setError(
        msg.includes("too large") || msg.includes("Payload")
          ? "Fichier trop volumineux pour le serveur. Réessayez (PDF < 10 Mo recommandé)."
          : msg
      );
      return false;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Sélectionnez un fichier PDF ou image.");
      return;
    }
    await doUpload(file);
  }

  /** Upload dès la sélection du fichier (évite de cliquer seulement « Enregistrer »). */
  async function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file || !canEdit) return;
    await doUpload(file);
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer la pièce jointe « ${nom} » ?`)) return;
    setError(null);
    setSuccess(null);
    const result = await deletePieceComptable(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    setSuccess(`« ${nom} » supprimé.`);
    router.refresh();
  }

  const Wrapper = compact ? "div" : Card;
  const wrapperClass = compact
    ? "mt-4 rounded-xl border border-mega-200 bg-mega-50/40 p-4"
    : "no-print !p-5";

  return (
    <Wrapper className={wrapperClass}>
      <h3 className="text-sm font-semibold text-slate-900">
        Justificatif / facture PDF
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        Choisissez un fichier : il est <strong>archivé immédiatement</strong>{" "}
        (pas besoin de cliquer sur Enregistrer). Visible aussi dans{" "}
        <a href="/archives" className="font-medium text-mega-700 hover:underline">
          Archives
        </a>
        .
      </p>

      {error && (
        <div className="mt-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-3">
          <Alert type="success">{success}</Alert>
        </div>
      )}

      {canEdit && (
        <form
          key={entityKey}
          onSubmit={handleUpload}
          className="mt-4 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            label="Libellé (optionnel)"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="ex. Facture pneus"
          />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fichier (PDF, image, Word, Excel — max 15 Mo)
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls,.doc,.docx"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mega-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
            />
          </div>
          {uploading && (
            <p className="text-sm font-medium text-mega-800">
              Envoi en cours…
              {progress != null ? ` ${progress} %` : ""}
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={uploading}>
            {uploading ? "Envoi…" : "Joindre un autre document"}
          </Button>
        </form>
      )}

      {loadingList && items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Chargement des pièces…</p>
      ) : items.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <a
                  href={`/api/pieces/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-mega-700 hover:underline"
                >
                  {p.nomOriginal}
                </a>
                {p.libelle && (
                  <p className="text-xs text-slate-500">{p.libelle}</p>
                )}
                <p className="text-xs text-slate-400">
                  {p.tailleOctets != null ? formatFileSize(p.tailleOctets) : ""}
                  {p.uploadedBy ? ` · ${p.uploadedBy}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/pieces/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-mega-700 hover:underline"
                >
                  Ouvrir
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.nomOriginal)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
          Aucune pièce pour l&apos;instant — sélectionnez un fichier ci-dessus.
        </p>
      )}
    </Wrapper>
  );
}
