"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import { MODES_PAIEMENT } from "@/lib/constants";
import { extractHtFromTtc, extractTvaFromTtc } from "@/lib/facturation";
import { formatFcfa } from "@/lib/format";
import {
  CategorieOption,
  CodeBudgetaireOption,
  OperationRow,
  ParametresApp,
} from "@/lib/types";
import { OperationInput } from "@/lib/validation";

type Props = {
  categories: CategorieOption[];
  codesBudgetaires: CodeBudgetaireOption[];
  params: ParametresApp;
  initial?: OperationRow | null;
  showMode?: boolean;
  /** Affiche le sélecteur TVA (journal uniquement). */
  showTva?: boolean;
  libelleField?: string;
  onSubmit: (
    input: OperationInput
  ) => Promise<
    { ok: true; id?: string; message?: string } | { ok: false; error: string }
  >;
  onCancel?: () => void;
  inModal?: boolean;
  formId?: string;
};

export function OperationForm({
  categories,
  codesBudgetaires,
  params,
  initial,
  showMode = true,
  showTva = false,
  libelleField = "Libellé",
  onSubmit,
  onCancel,
  inModal = false,
  formId = "operation-form",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(
    initial?.date ? initial.date.slice(0, 10) : ""
  );
  const [libelle, setLibelle] = useState(initial?.libelle ?? "");
  const [categorieId, setCategorieId] = useState(initial?.categorieId ?? "");
  const [codeBudgetaireId, setCodeBudgetaireId] = useState(
    initial?.codeBudgetaireId ?? ""
  );
  const [modePaiement, setModePaiement] = useState(
    initial?.modePaiement ?? ""
  );
  const [montantType, setMontantType] = useState<"entree" | "sortie">(
    initial?.entree ? "entree" : "sortie"
  );
  const [montant, setMontant] = useState(
    String(initial?.entree ?? initial?.sortie ?? "")
  );
  const [tauxTVA, setTauxTVA] = useState(
    initial?.tauxTVA && initial.tauxTVA > 0 ? String(initial.tauxTVA) : "0"
  );
  const [observations, setObservations] = useState(
    initial?.observations ?? ""
  );
  const [validePar, setValidePar] = useState(initial?.validePar ?? "");

  const selectedCat = categories.find((c) => c.id === categorieId);
  const montantNum = parseInt(montant.replace(/\s/g, ""), 10) || 0;
  const tauxNum = parseFloat(tauxTVA) || 0;
  const initialMontant = initial?.entree ?? initial?.sortie ?? 0;
  const initialType = initial?.entree ? "entree" : "sortie";
  const montantInchange =
    !!initial &&
    initialMontant === montantNum &&
    initialType === montantType &&
    montantNum > 0;
  const needsValidation =
    montantNum >= params.seuilDoubleValidation &&
    montantNum > 0 &&
    !montantInchange;

  const tvaPreview = useMemo(() => {
    if (!showTva || tauxNum <= 0 || montantNum <= 0) return null;
    const tva = extractTvaFromTtc(montantNum, tauxNum);
    const ht = extractHtFromTtc(montantNum, tauxNum);
    return { tva, ht };
  }, [showTva, tauxNum, montantNum]);

  useEffect(() => {
    if (selectedCat) {
      setMontantType(selectedCat.sens as "entree" | "sortie");
    }
  }, [selectedCat]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input: OperationInput = {
      date,
      numeroPiece: initial?.numeroPiece ?? "",
      libelle,
      categorieId,
      categorieNom: selectedCat?.nom,
      codeBudgetaireId,
      modePaiement: showMode ? modePaiement : undefined,
      montantType,
      montant: montantNum,
      tauxTVA: showTva ? tauxNum : 0,
      observations,
      validePar,
    };

    const result = await onSubmit(input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.message) {
      window.alert(result.message);
    }

    router.refresh();
    onCancel?.();
  }

  const tauxLabel = Math.round((params.tauxTVA || 0.18) * 100);

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {initial?.numeroPiece ? (
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              N° pièce
            </span>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
              {initial.numeroPiece}
            </div>
          </div>
        ) : (
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              N° pièce
            </span>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Attribué automatiquement à l&apos;enregistrement
            </div>
          </div>
        )}
        {showMode && (
          <Select
            label="Mode de paiement"
            value={modePaiement}
            onChange={(e) => setModePaiement(e.target.value)}
          >
            <option value=""></option>
            {MODES_PAIEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Input
        label={libelleField}
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Catégorie"
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
          required
        >
          <option value="">Choisir…</option>
          <optgroup label="Entrées">
            {categories
              .filter((c) => c.sens === "entree")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
          </optgroup>
          <optgroup label="Sorties">
            {categories
              .filter((c) => c.sens === "sortie")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
          </optgroup>
        </Select>

        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Code compte (automatique)
          </span>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {selectedCat
              ? `${selectedCat.codeCompte} · ${selectedCat.intituleCompte}`
              : ""}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Code budgétaire"
          value={codeBudgetaireId}
          onChange={(e) => setCodeBudgetaireId(e.target.value)}
        >
          <option value=""></option>
          {codesBudgetaires.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.beneficiaire}
            </option>
          ))}
        </Select>

        <Input
          label={`Montant (${montantType === "entree" ? "entrée" : "sortie"}) FCFA`}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="ex. 250 000"
          required
        />
      </div>

      {showTva && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="TVA"
            value={tauxTVA}
            onChange={(e) => setTauxTVA(e.target.value)}
          >
            <option value="0">Sans TVA</option>
            <option value={String(params.tauxTVA || 0.18)}>
              TVA {tauxLabel} % (montant TTC)
            </option>
          </Select>
          {tvaPreview ? (
            <div className="rounded-xl border border-mega-200 bg-mega-50/80 px-3 py-2 text-sm text-mega-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-mega-700">
                Dont TVA ({tauxLabel} %)
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {formatFcfa(tvaPreview.tva)} FCFA
              </p>
              <p className="text-xs text-mega-800">
                HT {formatFcfa(tvaPreview.ht)} ·{" "}
                {montantType === "entree"
                  ? "→ TVA collectée"
                  : "→ TVA déductible"}
              </p>
            </div>
          ) : (
            <p className="self-end text-xs text-slate-500">
              Sélectionnez TVA {tauxLabel} % pour l&apos;inclure dans la
              déclaration mensuelle.
            </p>
          )}
        </div>
      )}

      {needsValidation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Approbation CEO requise</p>
          <p className="mt-1 text-xs text-amber-800">
            Cette opération ≥ {formatFcfa(params.seuilDoubleValidation)} FCFA
            sera soumise à la CEO. Elle ne sera comptabilisée qu&apos;après son
            approbation.
          </p>
        </div>
      )}

      {montantInchange &&
        montantNum >= params.seuilDoubleValidation &&
        initial?.statutApprobation === "APPROUVE" && (
          <p className="rounded-xl bg-mega-50 px-3 py-2 text-xs text-mega-800">
            Montant inchangé et déjà approuvé : vous pouvez modifier le code
            budgétaire sans nouvelle demande CEO.
          </p>
        )}

      <Input
        label="Observations"
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
      />

      {!inModal && (
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : initial ? "Modifier" : "Ajouter"}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
