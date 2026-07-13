"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deletePieceComptable,
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
  const [uploading, setUploading] = useState(false);
  const [libelle, setLibelle] = useState("");

  const entityKey = link.factureId
    ? `facture-${link.factureId}`
    : link.operationId
      ? `op-${link.operationId}`
      : `caisse-${link.operationCaisseId}`;

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Sélectionnez un fichier.");
      return;
    }

    setError(null);
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
      return;
    }

    if (fileRef.current) fileRef.current.value = "";
    setLibelle("");
    router.refresh();
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer la pièce jointe « ${nom} » ?`)) return;
    setError(null);
    const result = await deletePieceComptable(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const Wrapper = compact ? "div" : Card;
  const wrapperClass = compact
    ? "mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
    : "no-print !p-5";

  return (
    <Wrapper className={wrapperClass}>
      <h3 className="text-sm font-semibold text-slate-900">
        Archivage · pièces comptables
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        PDF, images, Word ou Excel (max 15 Mo). Retrouvez tout dans{" "}
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

      {canEdit && (
        <form key={entityKey} onSubmit={handleUpload} className="mt-4 space-y-3">
          <Input
            label="Libellé (optionnel)"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="ex. Justificatif banque"
          />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fichier
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls,.doc,.docx"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mega-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-mega-700"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={uploading}>
            {uploading ? "Envoi…" : "Joindre un document"}
          </Button>
        </form>
      )}

      {pieces.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {pieces.map((p) => (
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
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.nomOriginal)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Aucune pièce archivée.</p>
      )}
    </Wrapper>
  );
}
