"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategorie,
  deleteCategorie,
  updateCategorie,
} from "@/app/actions/categories";
import { updateParametres } from "@/app/actions/parametres";
import {
  Alert,
  Button,
  Card,
  FormActions,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { MODES_PAIEMENT, STATUTS_ECHEANCE } from "@/lib/constants";

export type ParametresData = {
  entreprise: string;
  devise: string;
  annee: number;
  soldeInitialBanque: number;
  soldeInitialCaisse: number;
  plafondCaisse: number;
  seuilDoubleValidation: number;
  tauxTVA: number;
};

export type CategorieRef = {
  id: string;
  nom: string;
  sens: string;
  codeCompte: string;
  intituleCompte: string;
};

const CAT_FORM_ID = "categorie-form";

type CatModal =
  | { mode: "create"; sens?: "entree" | "sortie" }
  | { mode: "edit"; categorie: CategorieRef };

export function ParametresClient({
  params,
  categories,
}: {
  params: ParametresData;
  categories: CategorieRef[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catModal, setCatModal] = useState<CatModal | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const entrees = categories.filter((c) => c.sens === "entree");
  const sorties = categories.filter((c) => c.sens === "sortie");
  const toutes = [...entrees, ...sorties];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await updateParametres({
      entreprise: fd.get("entreprise") as string,
      devise: fd.get("devise") as string,
      annee: fd.get("annee") as string,
      soldeInitialBanque: fd.get("soldeInitialBanque") as string,
      soldeInitialCaisse: fd.get("soldeInitialCaisse") as string,
      plafondCaisse: fd.get("plafondCaisse") as string,
      seuilDoubleValidation: fd.get("seuilDoubleValidation") as string,
      tauxTVA: fd.get("tauxTVA") as string,
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  async function handleCatSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!catModal) return;
    setCatSaving(true);
    setCatError(null);

    const fd = new FormData(e.currentTarget);
    const nom = fd.get("nom") as string;
    const codeCompte = fd.get("codeCompte") as string;
    const intituleCompte = fd.get("intituleCompte") as string;

    const result =
      catModal.mode === "create"
        ? await createCategorie(
            nom,
            (catModal.sens ?? (fd.get("sens") as string)) as "entree" | "sortie",
            codeCompte,
            intituleCompte
          )
        : await updateCategorie(
            catModal.categorie.id,
            nom,
            codeCompte,
            intituleCompte
          );

    setCatSaving(false);
    if (!result.ok) {
      setCatError(result.error);
      return;
    }
    setCatModal(null);
    router.refresh();
  }

  async function handleDelete(cat: CategorieRef) {
    if (!confirm(`Supprimer la catégorie « ${cat.nom} » ?`)) return;
    const result = await deleteCategorie(cat.id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error">{error}</Alert>}
        {success && (
          <Alert type="success">Paramètres enregistrés avec succès.</Alert>
        )}

        <Card className="!p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              name="entreprise"
              label="Entreprise"
              defaultValue={params.entreprise}
              required
            />
            <Input
              name="devise"
              label="Devise"
              defaultValue={params.devise}
              required
            />
            <Input
              name="annee"
              label="Année exercice"
              type="number"
              defaultValue={String(params.annee)}
              min={2000}
              max={2100}
              required
            />
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <CategoryColumn
            title="Catégories d'entrées"
            categories={entrees}
            onAdd={() => setCatModal({ mode: "create", sens: "entree" })}
            onEdit={(c) => setCatModal({ mode: "edit", categorie: c })}
            onDelete={handleDelete}
          />
          <CategoryColumn
            title="Catégories de sorties"
            categories={sorties}
            onAdd={() => setCatModal({ mode: "create", sens: "sortie" })}
            onEdit={(c) => setCatModal({ mode: "edit", categorie: c })}
            onDelete={handleDelete}
          />
          <RefColumn
            title="Modes de paiement"
            items={[...MODES_PAIEMENT]}
          />
          <RefColumn title="Statuts" items={[...STATUTS_ECHEANCE]} />
          <Card className="overflow-hidden !p-0">
            <ColumnHeader
              title={`Soldes initiaux au 01/01/${params.annee} (FCFA)`}
            />
            <div className="space-y-4 p-4">
              <Input
                name="soldeInitialBanque"
                label="Solde initial Banque"
                defaultValue={String(params.soldeInitialBanque)}
                placeholder="2 743 910"
                required
              />
              <Input
                name="soldeInitialCaisse"
                label="Solde initial Petite Caisse"
                defaultValue={String(params.soldeInitialCaisse)}
                placeholder="150 000"
                required
              />
              <p className="text-xs leading-relaxed text-slate-500">
                Remplacez ces montants par vos vrais soldes de départ.
              </p>
            </div>
          </Card>
          <CategoryColumn
            title="Toutes catégories"
            subtitle="Liste déroulante"
            categories={toutes}
            onAdd={() => setCatModal({ mode: "create" })}
            onEdit={(c) => setCatModal({ mode: "edit", categorie: c })}
            onDelete={handleDelete}
            showSens
          />
        </div>

        <Card>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            Règles métier
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              name="plafondCaisse"
              label="Plafond petite caisse (FCFA)"
              defaultValue={String(params.plafondCaisse)}
            />
            <Input
              name="seuilDoubleValidation"
              label="Seuil double validation (FCFA)"
              defaultValue={String(params.seuilDoubleValidation)}
            />
            <Input
              name="tauxTVA"
              label="Taux TVA (%)"
              defaultValue={String(Math.round(params.tauxTVA * 100))}
              placeholder="18"
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Cliquez sur une catégorie pour la modifier · Codes détaillés dans{" "}
            <Link
              href="/plan-comptable"
              className="font-medium text-blue-600 hover:underline"
            >
              Plan comptable
            </Link>
          </p>
          <Button type="submit" disabled={loading} className="shrink-0">
            {loading ? "Enregistrement…" : "Enregistrer les paramètres"}
          </Button>
        </div>
      </form>

      <Modal
        open={!!catModal}
        onClose={() => {
          setCatModal(null);
          setCatError(null);
        }}
        title={
          catModal?.mode === "create"
            ? catModal.sens
              ? `Nouvelle catégorie (${catModal.sens === "entree" ? "entrée" : "sortie"})`
              : "Nouvelle catégorie"
            : "Modifier la catégorie"
        }
        size="md"
        footer={
          <FormActions
            formId={CAT_FORM_ID}
            onCancel={() => setCatModal(null)}
            loading={catSaving}
            submitLabel={catModal?.mode === "create" ? "Ajouter" : "Enregistrer"}
          />
        }
      >
        {catError && <Alert type="error">{catError}</Alert>}
        {catModal && (
          <form id={CAT_FORM_ID} onSubmit={handleCatSubmit} className="space-y-4">
            <Input
              name="nom"
              label="Nom de la catégorie"
              defaultValue={
                catModal.mode === "edit" ? catModal.categorie.nom : ""
              }
              required
              autoFocus
            />
            <Input
              name="codeCompte"
              label="Code compte (SYSCOHADA)"
              defaultValue={
                catModal.mode === "edit" ? catModal.categorie.codeCompte : ""
              }
              placeholder="ex. 628"
              required
            />
            <Input
              name="intituleCompte"
              label="Intitulé du compte"
              defaultValue={
                catModal.mode === "edit"
                  ? catModal.categorie.intituleCompte
                  : ""
              }
              required
            />
            {catModal.mode === "create" && !catModal.sens && (
              <Select name="sens" label="Sens" defaultValue="entree" required>
                <option value="entree">Entrée</option>
                <option value="sortie">Sortie</option>
              </Select>
            )}
            {catModal.mode === "create" && catModal.sens && (
              <p className="text-xs text-slate-500">
                Sens :{" "}
                <strong>
                  {catModal.sens === "entree" ? "Entrée" : "Sortie"}
                </strong>
              </p>
            )}
          </form>
        )}
      </Modal>
    </>
  );
}

function ColumnHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-white">
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[9px] text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}

function CategoryColumn({
  title,
  subtitle,
  categories,
  onAdd,
  onEdit,
  onDelete,
  showSens,
}: {
  title: string;
  subtitle?: string;
  categories: CategorieRef[];
  onAdd: () => void;
  onEdit: (c: CategorieRef) => void;
  onDelete: (c: CategorieRef) => void;
  showSens?: boolean;
}) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-white">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[9px] text-slate-400">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          title="Ajouter une catégorie"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
        {categories.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-slate-400">
            Aucune catégorie
          </li>
        )}
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="group flex items-center gap-1 px-2 py-2 hover:bg-slate-50"
          >
            <button
              type="button"
              onClick={() => onEdit(cat)}
              className="min-w-0 flex-1 text-left text-sm text-blue-600 hover:underline"
            >
              {cat.nom}
              {showSens && (
                <span className="ml-1 text-[10px] text-slate-400">
                  ({cat.sens === "entree" ? "E" : "S"})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onEdit(cat)}
              className="rounded p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-mega-600 group-hover:opacity-100"
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(cat)}
              className="rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RefColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="overflow-hidden !p-0">
      <ColumnHeader title={title} />
      <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
        {items.map((item) => (
          <li key={item} className="px-3 py-2 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
