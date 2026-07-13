"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import { CONTROLE_FILTER_LABELS } from "@/lib/controle-helpers";
import {
  filterDoublons,
  matchesCaisseControleFilter,
} from "@/lib/controle-filters";
import {
  CategorieOption,
  CodeBudgetaireOption,
  OperationRow,
  ParametresApp,
} from "@/lib/types";

const FORM_ID = "caisse-operation-form";

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
        <strong>N° pièce automatique</strong> — format{" "}
        <span className="font-mono">CA-2026-0001</span> à chaque nouvelle
        opération caisse.
      </Alert>

      {controleFilter && (
        <Alert type="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Filtre contrôle :</strong>{" "}
              {CONTROLE_FILTER_LABELS[controleFilter] ?? controleFilter} —{" "}
              {filtered.length} opération(s)
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

      {canWrite && <Fab onClick={openCreate} label="Nouvelle opération" />}

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
