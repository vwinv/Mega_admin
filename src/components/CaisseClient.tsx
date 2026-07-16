"use client";

import { Eye, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createOperationCaisse,
  deleteOperationCaisse,
  updateOperationCaisse,
} from "@/app/actions/caisse";
import {
  listPiecesCaisse,
  type PieceComptableRow,
} from "@/app/actions/pieces-comptables";
import { OperationForm } from "@/components/OperationForm";
import { PiecesComptablesPanel } from "@/components/PiecesComptablesPanel";
import { usePermissions } from "@/components/PermissionsProvider";
import { Pagination, paginateSlice } from "@/components/Pagination";
import {
  Button,
  Alert,
  Card,
  Fab,
  FormActions,
  Input,
  Modal,
  Select,
  StatCard,
  StickyToolbar,
} from "@/components/ui";
import { formatFcfa, formatFcfaLabel, formatFileSize } from "@/lib/format";
import { CONTROLE_FILTER_LABELS } from "@/lib/controle-helpers";
import {
  filterDoublons,
  matchesCaisseControleFilter,
} from "@/lib/controle-filters";
import { STATUT_APPROBATION_LABELS } from "@/lib/approbation";
import {
  CategorieOption,
  CodeBudgetaireOption,
  OperationRow,
  ParametresApp,
} from "@/lib/types";

const FORM_ID = "caisse-operation-form";

function PreviewField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
        {children}
      </dd>
    </div>
  );
}

type Props = {
  operations: OperationRow[];
  categories: CategorieOption[];
  codesBudgetaires: CodeBudgetaireOption[];
  params: ParametresApp;
  soldeActuel: number;
};

export function CaisseClient({
  operations,
  categories,
  codesBudgetaires,
  params,
  soldeActuel,
}: Props) {
  const { canWrite } = usePermissions();
  const searchParams = useSearchParams();
  const controleFilter = searchParams.get("controle") ?? "";
  const opId = searchParams.get("op");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OperationRow | null>(null);
  const [preview, setPreview] = useState<OperationRow | null>(null);
  const [previewPieces, setPreviewPieces] = useState<PieceComptableRow[]>([]);
  const [previewPiecesLoading, setPreviewPiecesLoading] = useState(false);
  const [filtreMois, setFiltreMois] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreTexte, setFiltreTexte] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editPieces, setEditPieces] = useState<PieceComptableRow[]>([]);

  useEffect(() => {
    if (editing?.id) {
      listPiecesCaisse(editing.id).then(setEditPieces);
    } else {
      setEditPieces([]);
    }
  }, [editing?.id]);

  useEffect(() => {
    if (!preview?.id) {
      setPreviewPieces([]);
      return;
    }
    let cancelled = false;
    setPreviewPiecesLoading(true);
    listPiecesCaisse(preview.id).then((pieces) => {
      if (!cancelled) {
        setPreviewPieces(pieces);
        setPreviewPiecesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [preview?.id]);

  useEffect(() => {
    if (!opId) return;
    const op = operations.find((o) => o.id === opId);
    if (op) {
      setModalOpen(false);
      setEditing(null);
      setPreview(op);
    }
  }, [opId, operations]);

  const filtered = useMemo(() => {
    let list = operations;
    if (controleFilter === "doublon") {
      list = filterDoublons(list);
    } else if (controleFilter) {
      list = list.filter((op) =>
        matchesCaisseControleFilter(op, controleFilter)
      );
    }

    return list.filter((op) => {
      if (filtreMois && op.date) {
        const m = new Date(op.date).getUTCMonth() + 1;
        if (String(m) !== filtreMois) return false;
      }
      if (filtreMois && !op.date) return false;
      if (filtreCategorie && op.categorieId !== filtreCategorie) return false;
      if (
        filtreTexte &&
        !op.libelle.toLowerCase().includes(filtreTexte.toLowerCase())
      )
        return false;
      return true;
    });
  }, [operations, controleFilter, filtreMois, filtreCategorie, filtreTexte]);

  useEffect(() => {
    setPage(1);
  }, [controleFilter, filtreMois, filtreCategorie, filtreTexte]);

  const paginated = useMemo(
    () => paginateSlice(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  function openCreate() {
    setPreview(null);
    setEditing(null);
    setModalOpen(true);
  }

  function openPreview(op: OperationRow) {
    setModalOpen(false);
    setEditing(null);
    setPreview(op);
  }

  function openEdit(op: OperationRow) {
    setPreview(null);
    setEditing(op);
    setModalOpen(true);
  }

  function closePreview() {
    setPreview(null);
    setPreviewPieces([]);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function editFromPreview() {
    if (!preview) return;
    openEdit(preview);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette opération ?")) return;
    await deleteOperationCaisse(id);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Solde initial"
          value={formatFcfaLabel(params.soldeInitialCaisse, params.devise)}
        />
        <StatCard
          label="Solde actuel"
          value={formatFcfaLabel(soldeActuel, params.devise)}
          variant={soldeActuel < 0 ? "negative" : "positive"}
        />
        <StatCard label="Opérations" value={String(operations.length)} />
      </div>

      <Alert type="info">
        <strong>N° pièce automatique</strong> : format{" "}
        <span className="font-mono">CA-2026-0001</span> à chaque nouvelle
        opération caisse.
      </Alert>

      {controleFilter && (
        <Alert type="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Filtre contrôle :</strong>{" "}
              {CONTROLE_FILTER_LABELS[controleFilter] ?? controleFilter} (
              {filtered.length} opération(s))
            </span>
            <Link
              href="/caisse"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline"
            >
              <X className="h-4 w-4" />
              Retirer le filtre
            </Link>
          </div>
        </Alert>
      )}

      <StickyToolbar>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Mois"
            value={filtreMois}
            onChange={(e) => setFiltreMois(e.target.value)}
            className="min-w-[120px]"
          >
            <option value="">Tous</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {new Date(2026, i).toLocaleString("fr-FR", { month: "long" })}
              </option>
            ))}
          </Select>
          <Select
            label="Catégorie"
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Select>
          <Input
            label="Recherche"
            value={filtreTexte}
            onChange={(e) => setFiltreTexte(e.target.value)}
            placeholder="Motif…"
            className="min-w-[140px] flex-1"
          />
          {canWrite && (
            <Button onClick={openCreate} className="hidden shrink-0 lg:inline-flex">
              <Plus className="mr-1.5 h-4 w-4" />
              Nouvelle opération
            </Button>
          )}
        </div>
      </StickyToolbar>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">N° pièce (auto)</th>
                <th className="text-left">Motif</th>
                <th className="text-left">Catégorie</th>
                <th className="text-left">Compte</th>
                <th className="text-left">Code budg.</th>
                <th className="text-right">Entrée</th>
                <th className="text-right">Sortie</th>
                <th className="text-right">Solde</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    Aucune opération. Cliquez sur + pour en ajouter
                  </td>
                </tr>
              )}
              {paginated.map((op) => (
                <tr
                  key={op.id}
                  onClick={() => openPreview(op)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPreview(op);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Aperçu de l'opération ${op.numeroPiece || op.libelle}`}
                  className="cursor-pointer transition-colors hover:bg-[var(--c-blue-50)] focus-visible:bg-[var(--c-blue-50)] focus-visible:outline-none"
                >
                  <td className="whitespace-nowrap">
                    {op.date
                      ? new Date(op.date).toLocaleDateString("fr-FR")
                      : ""}
                  </td>
                  <td className="font-mono text-xs text-slate-700">
                    {op.numeroPiece || ""}
                  </td>
                  <td className="max-w-[200px] truncate font-medium">
                    {op.libelle}
                    {(op.nbPieces ?? 0) > 0 && (
                      <span
                        className="ml-2 inline-flex items-center gap-0.5 rounded bg-mega-100 px-1.5 py-0.5 text-[10px] font-medium text-mega-800"
                        title={`${op.nbPieces} pièce(s) jointe(s)`}
                      >
                        <Paperclip className="h-3 w-3" />
                        {op.nbPieces}
                      </span>
                    )}
                    {op.statutApprobation === "EN_ATTENTE_CEO" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        {STATUT_APPROBATION_LABELS.EN_ATTENTE_CEO}
                      </span>
                    )}
                    {op.statutApprobation === "REFUSE" && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
                        Refusé
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-slate-600">{op.categorieNom}</td>
                  <td className="font-mono text-xs">{op.codeCompte}</td>
                  <td className="text-xs">{op.codeBudgetaire ?? ""}</td>
                  <td className="text-right font-medium text-mega-700">
                    {op.entree ? formatFcfa(op.entree) : ""}
                  </td>
                  <td className="text-right font-medium text-red-600">
                    {op.sortie ? formatFcfa(op.sortie) : ""}
                  </td>
                  <td
                    className={`text-right font-semibold ${(op.soldeCumule ?? 0) < 0 ? "text-red-600" : ""}`}
                  >
                    {op.soldeCumule !== undefined
                      ? formatFcfa(op.soldeCumule)
                      : ""}
                  </td>
                  <td
                    className="text-center whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        className="px-2 py-1.5 text-[var(--c-stone-600)]"
                        onClick={() => openPreview(op)}
                        title="Aperçu"
                        aria-label="Aperçu"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            className="px-2 py-1.5 text-[var(--c-blue-700)]"
                            onClick={() => openEdit(op)}
                            title="Modifier"
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1.5 text-[var(--c-clay-700)]"
                            onClick={() => handleDelete(op.id)}
                            title="Supprimer"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <p className="text-xs text-slate-500">
        {filtered.length} opération(s) sur {operations.length} : cliquez une
        ligne pour l&apos;aperçu
      </p>

      {canWrite && <Fab onClick={openCreate} label="Nouvelle opération" />}

      <Modal
        open={Boolean(preview)}
        onClose={closePreview}
        title="Aperçu de l'opération"
        description={
          preview?.numeroPiece
            ? `Pièce ${preview.numeroPiece}`
            : "Détail de l'opération caisse sélectionnée"
        }
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={closePreview}>
              Fermer
            </Button>
            {canWrite && preview && (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    void handleDelete(preview.id);
                  }}
                >
                  Supprimer
                </Button>
                <Button onClick={editFromPreview}>Modifier</Button>
              </>
            )}
          </div>
        }
      >
        {preview && (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--c-stone-50)] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-accent)]">
                {preview.categorieNom || "Petite caisse"}
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {preview.libelle}
              </h3>
              <div className="mt-4 flex flex-wrap gap-6">
                {preview.entree ? (
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                      Entrée
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--c-sage-700)]">
                      {formatFcfa(preview.entree)}
                    </p>
                  </div>
                ) : null}
                {preview.sortie ? (
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                      Sortie
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--c-clay-700)]">
                      {formatFcfa(preview.sortie)}
                    </p>
                  </div>
                ) : null}
                {preview.soldeCumule !== undefined ? (
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                      Solde après opération
                    </p>
                    <p
                      className={`mt-1 text-2xl font-semibold tabular-nums ${
                        preview.soldeCumule < 0
                          ? "text-[var(--c-clay-700)]"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {formatFcfa(preview.soldeCumule)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PreviewField label="Date">
                {preview.date
                  ? new Date(preview.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </PreviewField>
              <PreviewField label="N° pièce">
                <span className="font-mono">
                  {preview.numeroPiece || ""}
                </span>
              </PreviewField>
              <PreviewField label="Motif">{preview.libelle}</PreviewField>
              <PreviewField label="Compte">
                <span className="font-mono">{preview.codeCompte || ""}</span>
              </PreviewField>
              <PreviewField label="Code budgétaire">
                {preview.codeBudgetaire || ""}
              </PreviewField>
              <PreviewField label="Statut">
                {STATUT_APPROBATION_LABELS[
                  preview.statutApprobation as keyof typeof STATUT_APPROBATION_LABELS
                ] ?? preview.statutApprobation}
              </PreviewField>
              <PreviewField label="Validé / demandé par">
                {preview.validePar || preview.demandePar || ""}
              </PreviewField>
              <PreviewField label="Approuvé par">
                {preview.approuvePar || ""}
              </PreviewField>
            </dl>

            {preview.observations && (
              <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                  Observations
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                  {preview.observations}
                </p>
              </div>
            )}

            {preview.motifRefus && (
              <Alert type="error">
                <strong>Motif de refus :</strong> {preview.motifRefus}
              </Alert>
            )}

            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Pièces jointes
                </h4>
                {(preview.nbPieces ?? previewPieces.length) > 0 && (
                  <span className="text-xs text-[var(--muted)]">
                    {previewPieces.length || preview.nbPieces} document(s)
                  </span>
                )}
              </div>

              {previewPiecesLoading ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Chargement…</p>
              ) : previewPieces.length > 0 ? (
                <ul className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--card)]">
                  {previewPieces.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {p.nomOriginal}
                        </p>
                        {p.libelle && (
                          <p className="text-xs text-[var(--muted)]">
                            {p.libelle}
                          </p>
                        )}
                        <p className="text-xs text-[var(--muted)]">
                          {p.tailleOctets != null
                            ? formatFileSize(p.tailleOctets)
                            : ""}
                          {p.uploadedBy ? ` · ${p.uploadedBy}` : ""}
                        </p>
                      </div>
                      <a
                        href={`/api/pieces/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-medium text-[var(--c-blue-700)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ouvrir
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-[var(--border-strong)] px-3 py-3 text-sm text-[var(--muted)]">
                  Aucune pièce jointe pour cette opération.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Modifier l'opération" : "Nouvelle opération caisse"}
        description={
          editing
            ? "Modifiez l'écriture et archivez un justificatif ci-dessous."
            : "Le n° de pièce (CA-année-xxxx) sera attribué automatiquement."
        }
        size="lg"
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={closeModal}
            submitLabel={editing ? "Enregistrer" : "Ajouter"}
          />
        }
      >
        <OperationForm
          key={editing?.id ?? "new"}
          formId={FORM_ID}
          inModal
          categories={categories}
          codesBudgetaires={codesBudgetaires}
          params={params}
          initial={editing}
          showMode={false}
          libelleField="Motif"
          onSubmit={async (input) => {
            if (editing) return updateOperationCaisse(editing.id, input);
            const r = await createOperationCaisse(input);
            if (r.ok) closeModal();
            return r;
          }}
          onCancel={closeModal}
        />
        {editing?.id && (
          <PiecesComptablesPanel
            operationCaisseId={editing.id}
            pieces={editPieces}
            canEdit={canWrite}
            compact
          />
        )}
      </Modal>
    </div>
  );
}
