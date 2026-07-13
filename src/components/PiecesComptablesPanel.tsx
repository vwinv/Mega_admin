"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deletePieceComptable,
  listPiecesCaisse,
  listPiecesFacture,
  listPiecesOperation,
  uploadPieceComptable,
  type PieceComptableRow,
} from "@/app/actions/pieces-comptables";
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
  ...link
}: {
  pieces: PieceComptableRow[];
  canEdit: boolean;
  compact?: boolean;
} & EntityLink) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  async function doUpload(file: File) {
    setError(null);
    setSuccess(null);
    setUploading(true);
    const fd = new FormData();
    if (link.factureId) fd.set("factureId", link.factureId);
    if (link.operationId) fd.set("operationId", link.operationId);
    if (link.operationCaisseId)
      fd.set("operationCaisseId", link.operationCaisseId);
    fd.set("file", file);
    if (libelle.trim()) fd.set("libelle", libelle.trim());

    const result = await uploadPieceComptable(fd);
    setUploading(false);

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
            <p className="text-sm font-medium text-mega-800">Envoi en cours…</p>
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
