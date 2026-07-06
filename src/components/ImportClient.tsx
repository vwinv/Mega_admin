"use client";

import { FormEvent, useState } from "react";
import { importExcelFile } from "@/app/actions/import";
import { Alert, Button, Card } from "@/components/ui";
import type { ImportResult } from "@/lib/import-types";

export function ImportClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const response = await importExcelFile(formData);
    setLoading(false);

    if (!response.ok) {
      setError(response.error);
      return;
    }

    setResult(response.result);
    setFileName((formData.get("file") as File)?.name ?? null);
    (e.target as HTMLFormElement).reset();
  }

  function downloadTemplate() {
    window.location.href = "/api/import/template";
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Importer depuis Excel
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Chargez votre classeur Excel à jour. L&apos;import <strong>remplace</strong>{" "}
          toutes les opérations existantes (journal + caisse) et met à jour les
          paramètres, catégories et codes budgétaires.
        </p>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">Feuilles attendues dans le fichier .xlsx :</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800">
            <li><strong>Paramètres</strong> · entreprise, devise, année, soldes initiaux</li>
            <li><strong>Plan comptable</strong> · catégories SYSCOHADA (optionnel si inchangé)</li>
            <li><strong>Codes budgétaires</strong> · enveloppes (optionnel)</li>
            <li><strong>Journal</strong> · opérations banque / mobile money</li>
            <li><strong>Petite caisse</strong> · opérations espèces</li>
          </ul>
        </div>

        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={downloadTemplate}>
            Télécharger le modèle Excel
          </Button>
          <p className="mt-1 text-xs text-slate-500">
            Le modèle contient la structure et les données de référence actuelles.
            Modifiez-le dans Excel puis réimportez-le ici.
          </p>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}

          {result && (
            <Alert type="success">
              <p className="font-medium">
                Import réussi{fileName ? ` : ${fileName}` : ""}
              </p>
              <ul className="mt-2 list-inside list-disc text-sm">
                <li>{result.journal} opération(s) journal</li>
                <li>{result.caisse} opération(s) caisse</li>
                <li>{result.categories} catégorie(s)</li>
                <li>{result.codesBudgetaires} code(s) budgétaire(s)</li>
              </ul>
              {result.warnings.length > 0 && (
                <div className="mt-3 border-t border-mega-200 pt-2">
                  <p className="font-medium text-amber-800">
                    {result.warnings.length} avertissement(s) :
                  </p>
                  <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-amber-900">
                    {result.warnings.slice(0, 10).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {result.warnings.length > 10 && (
                      <li>… et {result.warnings.length - 10} autres</li>
                    )}
                  </ul>
                </div>
              )}
            </Alert>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Fichier Excel (.xlsx)
            </label>
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              required
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-mega-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-mega-700"
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Import en cours…" : "Importer et remplacer les données"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800">Colonnes du Journal</h3>
        <p className="mt-2 font-mono text-xs text-slate-600">
          date · piece · libelle · categorie · code_budgetaire · mode · entree · sortie · observations
        </p>
        <h3 className="mt-4 font-semibold text-slate-800">Colonnes Petite caisse</h3>
        <p className="mt-2 font-mono text-xs text-slate-600">
          date · piece · motif · categorie · code_budgetaire · entree · sortie
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Les noms de colonnes peuvent être en français (avec ou sans accents).
          Montants en FCFA sans décimales. Dates au format JJ/MM/AAAA ou AAAA-MM-JJ.
        </p>
      </Card>
    </div>
  );
}
