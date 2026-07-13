"use client";

import { Paperclip, Plus, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createOperation,
  deleteOperation,
  updateOperation,
} from "@/app/actions/journal";
import {
  listPiecesOperation,
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
  StickyToolbar,
} from "@/components/ui";
import { MODES_PAIEMENT } from "@/lib/constants";
import { CONTROLE_FILTER_LABELS } from "@/lib/controle-helpers";
import {
  filterDoublons,
  matchesJournalControleFilter,
} from "@/lib/controle-filters";
import { extractTvaFromTtc } from "@/lib/facturation";
import { STATUT_APPROBATION_LABELS } from "@/lib/approbation";
import { formatFcfa } from "@/lib/format";
import {
  CategorieOption,
  CodeBudgetaireOption,
  OperationRow,
  ParametresApp,
} from "@/lib/types";

const FORM_ID = "journal-operation-form";

type Props = {
  operations: OperationRow[];
  categories: CategorieOption[];
  codesBudgetaires: CodeBudgetaireOption[];
  params: ParametresApp;
};

export function JournalClient({
  operations,
  categories,
  codesBudgetaires,
  params,
}: Props) {
  const { canWrite } = usePermissions();
  const searchParams = useSearchParams();
  const controleFilter = searchParams.get("controle") ?? "";
  const opId = searchParams.get("op");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OperationRow | null>(null);
  const [filtreMois, setFiltreMois] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreCode, setFiltreCode] = useState("");
  const [filtreMode, setFiltreMode] = useState("");
  const [filtreTexte, setFiltreTexte] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editPieces, setEditPieces] = useState<PieceComptableRow[]>([]);

  useEffect(() => {
    if (editing?.id) {
      listPiecesOperation(editing.id).then(setEditPieces);
    } else {
      setEditPieces([]);
    }
  }, [editing?.id]);

  useEffect(() => {
    if (!opId) return;
    const op = operations.find((o) => o.id === opId);
    if (op) {
      setEditing(op);
      setModalOpen(true);
    }
  }, [opId, operations]);

  const filtered = useMemo(() => {
    let list = operations;
    if (controleFilter === "doublon") {
      list = filterDoublons(list);
    } else if (controleFilter) {
      list = list.filter((op) =>
        matchesJournalControleFilter(op, controleFilter)
      );
    }

    return list.filter((op) => {
      if (filtreMois && op.date) {
        const m = new Date(op.date).getUTCMonth() + 1;
        if (String(m) !== filtreMois) return false;
      }
      if (filtreMois && !op.date) return false;
      if (filtreCategorie && op.categorieId !== filtreCategorie) return false;
      if (filtreCode && op.codeBudgetaireId !== filtreCode) return false;
      if (filtreMode && op.modePaiement !== filtreMode) return false;
      if (
        filtreTexte &&
        !op.libelle.toLowerCase().includes(filtreTexte.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    operations,
    controleFilter,
    filtreMois,
    filtreCategorie,
    filtreCode,
    filtreMode,
    filtreTexte,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    controleFilter,
    filtreMois,
    filtreCategorie,
    filtreCode,
    filtreMode,
    filtreTexte,
  ]);

  const paginated = useMemo(
    () => paginateSlice(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(op: OperationRow) {
    setEditing(op);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette opération ?")) return;
    await deleteOperation(id);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <Alert type="info">
        <strong>N° pièce automatique</strong> — chaque nouvelle écriture reçoit un
        numéro du type <span className="font-mono">BN-2026-0001</span>. Sélectionnez{" "}
        <strong>TVA 18 %</strong> pour l&apos;inclure dans la déclaration mensuelle
        (Impôts).
      </Alert>

      {controleFilter && (
        <Alert type="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Filtre contrôle :</strong>{" "}
              {CONTROLE_FILTER_LABELS[controleFilter] ?? controleFilter} —{" "}
              {filtered.length} écriture(s)
            </span>
            <Link
              href="/journal"
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
          <Select
            label="Code budgétaire"
            value={filtreCode}
            onChange={(e) => setFiltreCode(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="">Tous</option>
            {codesBudgetaires.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </Select>
          <Select
            label="Mode"
            value={filtreMode}
            onChange={(e) => setFiltreMode(e.target.value)}
            className="min-w-[130px]"
          >
            <option value="">Tous</option>
            {MODES_PAIEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Input
            label="Recherche"
            value={filtreTexte}
            onChange={(e) => setFiltreTexte(e.target.value)}
            placeholder="Libellé…"
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
                <th className="text-left">Libellé</th>
                <th className="text-left">Catégorie</th>
                <th className="text-left">Compte</th>
                <th className="text-left">Code budg.</th>
                <th className="text-left">Mode</th>
                <th className="text-left">TVA</th>
                <th className="text-right">Entrée</th>
                <th className="text-right">Sortie</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    Aucune opération. Cliquez sur + pour en ajouter
                  </td>
                </tr>
              )}
              {paginated.map((op) => (
                <tr key={op.id}>
                  <td className="whitespace-nowrap">
                    {op.date
                      ? new Date(op.date).toLocaleDateString("fr-FR")
                      : ""}
                  </td>
                  <td className="font-mono text-xs text-slate-700">
                    {op.numeroPiece || (
                      <span className="text-slate-400">—</span>
                    )}
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
                  <td className="max-w-[150px] truncate text-xs text-slate-600">
                    {op.categorieNom}
                  </td>
                  <td className="font-mono text-xs">{op.codeCompte}</td>
                  <td className="text-xs">{op.codeBudgetaire ?? ""}</td>
                  <td className="text-xs">{op.modePaiement ?? ""}</td>
                  <td className="whitespace-nowrap text-xs">
                    {op.tauxTVA > 0 ? (
                      <span className="rounded bg-mega-100 px-1.5 py-0.5 font-medium text-mega-800">
                        {Math.round(op.tauxTVA * 100)} % ·{" "}
                        {formatFcfa(
                          extractTvaFromTtc(
                            op.entree ?? op.sortie ?? 0,
                            op.tauxTVA
                          )
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-right font-medium text-mega-700">
                    {op.entree ? formatFcfa(op.entree) : ""}
                  </td>
                  <td className="text-right font-medium text-red-600">
                    {op.sortie ? formatFcfa(op.sortie) : ""}
                  </td>
                  <td className="text-center whitespace-nowrap">
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          onClick={() => openEdit(op)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs text-red-600"
                          onClick={() => handleDelete(op.id)}
                        >
                          Suppr.
                        </Button>
                      </>
                    )}
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
        {filtered.length} opération(s) sur {operations.length}
      </p>

      {canWrite && <Fab onClick={openCreate} label="Nouvelle opération" />}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Modifier l'opération" : "Nouvelle opération"}
        description={
          editing
            ? "Joignez le PDF dans la zone verte ci-dessous (archivage immédiat). « Enregistrer » ne concerne que l'écriture."
            : "Le n° de pièce (BN-année-xxxx) sera attribué automatiquement."
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
          showMode
          showTva
          onSubmit={async (input) => {
            if (editing) return updateOperation(editing.id, input);
            const r = await createOperation(input);
            if (r.ok) closeModal();
            return r;
          }}
          onCancel={closeModal}
        />
        {editing?.id && (
          <PiecesComptablesPanel
            operationId={editing.id}
            pieces={editPieces}
            canEdit={canWrite}
            compact
          />
        )}
      </Modal>
    </div>
  );
}
