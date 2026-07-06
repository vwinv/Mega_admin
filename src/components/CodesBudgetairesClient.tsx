"use client";

import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  createCodeBudgetaire,
  deleteCodeBudgetaire,
  updateCodeBudgetaire,
} from "@/app/actions/codes-budgetaires";
import {
  Alert,
  Button,
  Card,
  Fab,
  FormActions,
  Input,
  Modal,
} from "@/components/ui";
import { formatFcfaLabel } from "@/lib/format";

type CodeData = {
  id: string;
  code: string;
  beneficiaire: string;
  enveloppe: number;
  depense: number;
  reste: number;
  pct: number;
  depasse: boolean;
};

const CREATE_FORM_ID = "code-budget-create";
const EDIT_FORM_ID = "code-budget-edit";

export function CodesBudgetairesClient({
  codes,
  devise,
}: {
  codes: CodeData[];
  devise: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CodeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await createCodeBudgetaire(
      fd.get("code") as string,
      fd.get("beneficiaire") as string,
      fd.get("enveloppe") as string
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowCreate(false);
    window.location.reload();
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await updateCodeBudgetaire(
      editing.id,
      fd.get("beneficiaire") as string,
      fd.get("enveloppe") as string
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(null);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce code budgétaire ?")) return;
    const result = await deleteCodeBudgetaire(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="hidden lg:inline-flex">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau code
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {codes.map((code) => (
          <Card key={code.id} className="transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-bold text-slate-900">
                  {code.code}
                </p>
                <p className="text-sm text-slate-600">{code.beneficiaire}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => setEditing(code)}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs text-red-600"
                  onClick={() => handleDelete(code.id)}
                >
                  Suppr.
                </Button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Enveloppe</dt>
                <dd className="font-semibold">
                  {formatFcfaLabel(code.enveloppe, devise)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Dépensé</dt>
                <dd className="font-semibold text-red-600">
                  {formatFcfaLabel(code.depense, devise)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Reste</dt>
                <dd
                  className={`font-semibold ${code.reste < 0 ? "text-red-600" : "text-mega-700"}`}
                >
                  {formatFcfaLabel(code.reste, devise)}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Consommé</span>
                <span className={code.depasse ? "font-bold text-red-600" : ""}>
                  {code.pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${code.depasse ? "bg-red-500" : "bg-mega-500"}`}
                  style={{ width: `${Math.min(code.pct, 100)}%` }}
                />
              </div>
              {code.depasse && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Enveloppe dépassée
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Fab onClick={() => setShowCreate(true)} label="Nouveau code" />

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setError(null);
        }}
        title="Nouveau code budgétaire"
        size="md"
        footer={
          <FormActions
            formId={CREATE_FORM_ID}
            onCancel={() => setShowCreate(false)}
            submitLabel="Créer"
          />
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        <form id={CREATE_FORM_ID} onSubmit={handleCreate} className="space-y-4">
          <Input name="code" label="Code (ex. BUD-PROJET2)" required />
          <Input name="beneficiaire" label="Bénéficiaire" required />
          <Input name="enveloppe" label="Enveloppe (FCFA)" placeholder="0" />
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setError(null);
        }}
        title={`Modifier ${editing?.code ?? ""}`}
        size="md"
        footer={
          <FormActions
            formId={EDIT_FORM_ID}
            onCancel={() => setEditing(null)}
            submitLabel="Enregistrer"
          />
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        {editing && (
          <form id={EDIT_FORM_ID} onSubmit={handleUpdate} className="space-y-4">
            <Input
              name="beneficiaire"
              label="Bénéficiaire"
              defaultValue={editing.beneficiaire}
              required
            />
            <Input
              name="enveloppe"
              label="Enveloppe (FCFA)"
              defaultValue={String(editing.enveloppe)}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
