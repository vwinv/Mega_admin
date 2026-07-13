"use client";

import { Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCategorieCompte } from "@/app/actions/plan-comptable";
import {
  Alert,
  Button,
  Card,
  FormActions,
  Input,
  Modal,
  StickyToolbar,
} from "@/components/ui";

export type CategoriePlan = {
  id: string;
  nom: string;
  codeCompte: string;
  intituleCompte: string;
  sens: string;
};

const FORM_ID = "plan-comptable-form";

export function PlanComptableClient({
  categories,
}: {
  categories: CategoriePlan[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CategoriePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.codeCompte.toLowerCase().includes(q) ||
        c.intituleCompte.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const entrees = filtered.filter((c) => c.sens === "entree");
  const sorties = filtered.filter((c) => c.sens === "sortie");

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await updateCategorieCompte(
      editing.id,
      fd.get("codeCompte") as string,
      fd.get("intituleCompte") as string
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/80 to-white">
        <p className="text-sm leading-relaxed text-slate-600">
          Codes indicatifs à faire valider par votre expert-comptable. Cliquez sur
          le code compte (bleu) pour le modifier : journal, caisse et synthèse se
          mettent à jour automatiquement.
        </p>
      </Card>

      <StickyToolbar>
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
          <Input
            label="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Catégorie, code, intitulé…"
            className="pl-9"
          />
        </div>
      </StickyToolbar>

      <PlanTable
        title="Entrées"
        rows={entrees}
        variant="entree"
        onEdit={setEditing}
      />
      <PlanTable
        title="Sorties"
        rows={sorties}
        variant="sortie"
        onEdit={setEditing}
      />

      <p className="text-xs text-slate-500">
        {filtered.length} catégorie(s) · SYSCOHADA / OHADA
      </p>

      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setError(null);
        }}
        title="Modifier le compte SYSCOHADA"
        description={editing?.nom}
        size="md"
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        {editing && (
          <form id={FORM_ID} onSubmit={handleSave} className="space-y-4">
            <Input
              name="codeCompte"
              label="Code compte"
              defaultValue={editing.codeCompte}
              required
            />
            <Input
              name="intituleCompte"
              label="Intitulé du compte (SYSCOHADA)"
              defaultValue={editing.intituleCompte}
              required
            />
          </form>
        )}
      </Modal>
    </div>
  );
}

function PlanTable({
  title,
  rows,
  variant,
  onEdit,
}: {
  title: string;
  rows: CategoriePlan[];
  variant: "entree" | "sortie";
  onEdit: (c: CategoriePlan) => void;
}) {
  const headerBg =
    variant === "entree"
      ? "bg-mega-600 text-white"
      : "bg-slate-800 text-white";

  return (
    <Card className="overflow-hidden p-0">
      <div className={`px-6 py-3 ${headerBg}`}>
        <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Catégorie
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-blue-600">
                Code compte
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Intitulé du compte (SYSCOHADA)
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Sens
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  Aucune catégorie
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr
                key={c.id}
                className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
              >
                <td className="px-4 py-3 font-medium text-slate-800">{c.nom}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onEdit(c)}
                    className="group inline-flex items-center gap-1.5 font-mono text-sm font-bold text-blue-600 hover:text-blue-800"
                  >
                    {c.codeCompte}
                    <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.intituleCompte}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.sens === "entree"
                        ? "bg-mega-100 text-mega-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {c.sens === "entree" ? "Entrée" : "Sortie"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
