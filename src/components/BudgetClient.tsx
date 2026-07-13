"use client";

import { ChevronDown, ChevronRight, Pencil, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveBudgetLigne } from "@/app/actions/budget";
import {
  Button,
  Card,
  FormActions,
  Input,
  Modal,
  StatCard,
  StickyToolbar,
} from "@/components/ui";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";

export type LigneBudget = {
  categorie: {
    id: string;
    nom: string;
    sens: string;
    codeCompte: string;
  };
  mois: {
    mois: number;
    label: string;
    budget: number;
    realise: number;
    ecart: number;
  }[];
  totalBudget: number;
  totalRealise: number;
  totalEcart: number;
};

type Onglet = "previsionnel" | "realise" | "ecart";

type EditTarget = {
  categorieId: string;
  categorieNom: string;
  mois: number;
  moisLabel: string;
  budget: number;
  realise: number;
};

const ONGLETS: { id: Onglet; label: string; short: string; desc: string }[] = [
  {
    id: "previsionnel",
    label: "Budget prévisionnel",
    short: "Prévisionnel",
    desc: "À saisir. Cliquez sur une valeur pour ouvrir le formulaire",
  },
  {
    id: "realise",
    label: "Réalisé",
    short: "Réalisé",
    desc: "Calculé automatiquement depuis le Journal et la Petite caisse",
  },
  {
    id: "ecart",
    label: "Écart",
    short: "Écart",
    desc: "Budget − Réalisé · Sorties : + = économie · Entrées : − = mieux que prévu",
  },
];

function getVal(ligne: LigneBudget, mois: number, onglet: Onglet) {
  const m = ligne.mois.find((x) => x.mois === mois);
  if (!m) return 0;
  if (onglet === "previsionnel") return m.budget;
  if (onglet === "realise") return m.realise;
  return m.ecart;
}

function getTotal(ligne: LigneBudget, onglet: Onglet) {
  if (onglet === "previsionnel") return ligne.totalBudget;
  if (onglet === "realise") return ligne.totalRealise;
  return ligne.totalEcart;
}

function ligneHasData(ligne: LigneBudget, onglet: Onglet) {
  return ligne.mois.some((m) => {
    if (onglet === "previsionnel") return m.budget > 0;
    if (onglet === "realise") return m.realise > 0;
    return m.ecart !== 0;
  });
}

function fmt(v: number) {
  return v === 0 ? "" : formatFcfa(v);
}

function ecartColor(v: number, sens: string) {
  if (v === 0) return "text-slate-300";
  if (sens === "sortie") return v > 0 ? "text-mega-600" : "text-red-600";
  return v < 0 ? "text-mega-600" : "text-red-600";
}

function cellBg(v: number, onglet: Onglet, sens: string) {
  if (v === 0) return "";
  if (onglet === "previsionnel") return "bg-blue-50/60";
  if (onglet === "realise") return sens === "entree" ? "bg-mega-50/50" : "bg-red-50/40";
  if (sens === "sortie") return v > 0 ? "bg-mega-50/60" : "bg-red-50/60";
  return v < 0 ? "bg-mega-50/60" : "bg-red-50/60";
}

const FORM_ID = "budget-edit-form";

export function BudgetClient({
  lignes,
  moisLabels,
  annee,
}: {
  lignes: LigneBudget[];
  moisLabels: string[];
  annee: number;
}) {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("previsionnel");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [entreesOpen, setEntreesOpen] = useState(true);
  const [sortiesOpen, setSortiesOpen] = useState(true);

  const entrees = useMemo(
    () => lignes.filter((l) => l.categorie.sens === "entree"),
    [lignes]
  );
  const sorties = useMemo(
    () => lignes.filter((l) => l.categorie.sens === "sortie"),
    [lignes]
  );

  const filterRows = (rows: LigneBudget[]) =>
    rows.filter((l) => {
      if (search && !l.categorie.nom.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (hideEmpty && !ligneHasData(l, onglet)) return false;
      return true;
    });

  const entreesFiltrees = filterRows(entrees);
  const sortiesFiltrees = filterRows(sorties);

  const totauxMensuels = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mois = i + 1;
      const entree = entrees.reduce((s, l) => s + getVal(l, mois, onglet), 0);
      const sortie = sorties.reduce((s, l) => s + getVal(l, mois, onglet), 0);
      return { mois, entree, sortie, solde: entree - sortie };
    });
  }, [entrees, sorties, onglet]);

  const totauxAnnuels = useMemo(() => {
    const entree = entrees.reduce((s, l) => s + getTotal(l, onglet), 0);
    const sortie = sorties.reduce((s, l) => s + getTotal(l, onglet), 0);
    return { entree, sortie, solde: entree - sortie };
  }, [entrees, sorties, onglet]);

  const editable = onglet === "previsionnel";
  const soldeLabel =
    onglet === "previsionnel"
      ? "Solde prévisionnel"
      : onglet === "realise"
        ? "Solde réalisé"
        : "Écart sur solde";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await saveBudgetLigne(
      editTarget.categorieId,
      editTarget.mois,
      fd.get("montant") as string
    );
    setSaving(false);
    setEditTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Onglets segmentés */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
          {ONGLETS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOnglet(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                onglet === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.short}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          {ONGLETS.find((t) => t.id === onglet)?.desc}
        </p>
      </div>

      {/* Résumé */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total entrées"
          value={formatFcfaLabel(totauxAnnuels.entree)}
          variant="positive"
        />
        <StatCard
          label="Total sorties"
          value={formatFcfaLabel(totauxAnnuels.sortie)}
          variant="negative"
        />
        <StatCard
          label={soldeLabel}
          value={formatFcfaLabel(totauxAnnuels.solde)}
          variant={
            totauxAnnuels.solde === 0
              ? "default"
              : totauxAnnuels.solde > 0
                ? "positive"
                : "negative"
          }
        />
      </div>

      {/* Filtres sticky */}
      <StickyToolbar>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            <Input
              label="Rechercher une catégorie"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex. Salaires, Internet…"
              className="pl-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
              className="rounded border-slate-300 text-mega-600 focus:ring-mega-500"
            />
            Masquer lignes vides
          </label>
        </div>
      </StickyToolbar>

      {/* Tableau */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="sticky left-0 z-20 min-w-[220px] bg-slate-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                  Catégorie
                </th>
                {moisLabels.map((m) => (
                  <th
                    key={m}
                    className="min-w-[76px] px-1 py-3 text-center text-[11px] font-bold uppercase text-slate-500"
                  >
                    {m.slice(0, 3)}
                  </th>
                ))}
                <th className="min-w-[96px] px-4 py-3 text-right text-[11px] font-bold uppercase text-slate-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionToggle
                label="Entrées"
                count={entreesFiltrees.length}
                open={entreesOpen}
                onToggle={() => setEntreesOpen(!entreesOpen)}
                colSpan={14}
                variant="entree"
              />
              {entreesOpen &&
                entreesFiltrees.map((ligne) => (
                  <DataRow
                    key={ligne.categorie.id}
                    ligne={ligne}
                    moisLabels={moisLabels}
                    onglet={onglet}
                    editable={editable}
                    onEdit={setEditTarget}
                  />
                ))}
              <SummaryRow
                label="Total entrées"
                values={totauxMensuels.map((t) => t.entree)}
                total={totauxAnnuels.entree}
                variant="entree"
              />

              <SectionToggle
                label="Sorties"
                count={sortiesFiltrees.length}
                open={sortiesOpen}
                onToggle={() => setSortiesOpen(!sortiesOpen)}
                colSpan={14}
                variant="sortie"
              />
              {sortiesOpen &&
                sortiesFiltrees.map((ligne) => (
                  <DataRow
                    key={ligne.categorie.id}
                    ligne={ligne}
                    moisLabels={moisLabels}
                    onglet={onglet}
                    editable={editable}
                    onEdit={setEditTarget}
                  />
                ))}
              <SummaryRow
                label="Total sorties"
                values={totauxMensuels.map((t) => t.sortie)}
                total={totauxAnnuels.sortie}
                variant="sortie"
              />

              <SummaryRow
                label={soldeLabel}
                values={totauxMensuels.map((t) => t.solde)}
                total={totauxAnnuels.solde}
                variant="solde"
                highlight
              />
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Budget prévisionnel"
        description={
          editTarget
            ? `${editTarget.categorieNom} · ${editTarget.moisLabel} ${annee}`
            : undefined
        }
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={() => setEditTarget(null)}
            loading={saving}
          />
        }
      >
        {editTarget && (
          <form id={FORM_ID} onSubmit={handleSave} className="space-y-4">
            {editTarget.realise > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">Réalisé à ce jour</span>
                <span className="font-bold text-red-600">
                  {formatFcfa(editTarget.realise)}
                </span>
              </div>
            )}
            <Input
              name="montant"
              label="Montant prévisionnel (FCFA)"
              defaultValue={editTarget.budget > 0 ? String(editTarget.budget) : ""}
              placeholder="0"
              autoFocus
            />
          </form>
        )}
      </Modal>
    </div>
  );
}

function SectionToggle({
  label,
  count,
  open,
  onToggle,
  colSpan,
  variant,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  colSpan: number;
  variant: "entree" | "sortie";
}) {
  const colors =
    variant === "entree"
      ? "bg-mega-50 text-mega-800 border-mega-100"
      : "bg-red-50 text-red-800 border-red-100";

  return (
    <tr className={`border-y ${colors}`}>
      <td colSpan={colSpan} className="px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-wider"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {label}
          <span className="ml-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold">
            {count}
          </span>
        </button>
      </td>
    </tr>
  );
}

function DataRow({
  ligne,
  moisLabels,
  onglet,
  editable,
  onEdit,
}: {
  ligne: LigneBudget;
  moisLabels: string[];
  onglet: Onglet;
  editable: boolean;
  onEdit: (t: EditTarget) => void;
}) {
  const total = getTotal(ligne, onglet);
  const sens = ligne.categorie.sens;

  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
      <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
        <p className="text-sm font-medium text-slate-800">{ligne.categorie.nom}</p>
        <p className="font-mono text-[10px] text-slate-400">
          {ligne.categorie.codeCompte}
        </p>
      </td>
      {ligne.mois.map((m, idx) => {
        const v = getVal(ligne, m.mois, onglet);
        const bg = cellBg(v, onglet, sens);
        const color =
          onglet === "ecart" ? ecartColor(v, sens) : "text-slate-800";

        if (editable) {
          return (
            <td key={m.mois} className="p-0.5">
              <button
                type="button"
                onClick={() =>
                  onEdit({
                    categorieId: ligne.categorie.id,
                    categorieNom: ligne.categorie.nom,
                    mois: m.mois,
                    moisLabel: moisLabels[idx],
                    budget: m.budget,
                    realise: m.realise,
                  })
                }
                className={`group flex h-full w-full min-h-[36px] items-center justify-center rounded-lg text-xs tabular-nums transition-all hover:ring-2 hover:ring-mega-400/40 ${bg} ${v === 0 ? "text-slate-300" : "font-medium text-slate-800"}`}
              >
                {fmt(v)}
                <Pencil className="ml-0.5 h-2.5 w-2.5 opacity-0 group-hover:opacity-50" />
              </button>
            </td>
          );
        }

        return (
          <td
            key={m.mois}
            className={`px-1 py-2 text-center text-xs tabular-nums ${bg} ${color} ${v !== 0 ? "font-medium" : ""}`}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td className="px-4 py-2 text-right text-xs font-bold tabular-nums text-slate-900">
        {fmt(total)}
      </td>
    </tr>
  );
}

function SummaryRow({
  label,
  values,
  total,
  variant,
  highlight = false,
}: {
  label: string;
  values: number[];
  total: number;
  variant: "entree" | "sortie" | "solde";
  highlight?: boolean;
}) {
  const bg = highlight
    ? "bg-slate-900 text-white"
    : variant === "entree"
      ? "bg-mega-600/90 text-white"
      : "bg-red-600/90 text-white";

  return (
    <tr className={bg}>
      <td
        className={`sticky left-0 z-10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide ${
          highlight ? "bg-slate-900" : variant === "entree" ? "bg-mega-600/90" : "bg-red-600/90"
        }`}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-1 py-2.5 text-center text-xs font-bold tabular-nums ${
            highlight && v < 0
              ? "text-red-300"
              : highlight && v > 0
                ? "text-mega-300"
                : ""
          }`}
        >
          {fmt(v)}
        </td>
      ))}
      <td
        className={`px-4 py-2.5 text-right text-xs font-bold tabular-nums ${
          highlight && total < 0
            ? "text-red-300"
            : highlight && total > 0
              ? "text-mega-300"
              : ""
        }`}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}
