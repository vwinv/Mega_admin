"use client";

import { FormEvent, useState } from "react";
import {
  createEcheance,
  deleteEcheance,
  updateEcheanceStatut,
} from "@/app/actions/impots";
import { TvaCalculator } from "@/components/TvaCalculator";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  Fab,
  FormActions,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import {
  EcheanceRow,
  REFERENTIEL_IMPOTS,
  TvaMensuelle,
} from "@/lib/impots-types";

export function ImpotsClient({
  echeances,
  tvaMensuelle,
  annee,
  devise,
  tauxTVA,
}: {
  echeances: EcheanceRow[];
  tvaMensuelle: TvaMensuelle[];
  annee: number;
  devise: string;
  tauxTVA: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const result = await createEcheance(new FormData(e.currentTarget));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowForm(false);
    window.location.reload();
  }

  async function handleStatutChange(id: string, statut: string) {
    await updateEcheanceStatut(id, statut);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette échéance ?")) return;
    await deleteEcheance(id);
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Référentiel fiscal sénégalais</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {REFERENTIEL_IMPOTS.map((imp) => (
            <div
              key={imp.code}
              className="rounded-lg border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800">{imp.libelle}</p>
                <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-mono">
                  {imp.code}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Taux : {imp.taux} · {imp.periodicite}
              </p>
              <p className="mt-2 text-sm text-slate-600">{imp.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <TvaCalculator
        lignes={tvaMensuelle}
        annee={annee}
        devise={devise}
        tauxTVA={tauxTVA}
      />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Échéancier impôts & taxes</h2>
          <Button onClick={() => setShowForm(true)} className="hidden lg:inline-flex">
            + Ajouter une échéance
          </Button>
        </div>

        <Modal
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setError(null);
          }}
          title="Nouvelle échéance"
          description="Impôts & taxes · saisie en popup"
          size="lg"
          footer={
            <FormActions
              formId="echeance-form"
              onCancel={() => setShowForm(false)}
              submitLabel="Enregistrer"
            />
          }
        >
          {error && <Alert type="error">{error}</Alert>}
          <form id="echeance-form" onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <Input name="echeance" label="Date d'échéance" type="date" required />
            <Select name="impot" label="Impôt" required>
              <option value="">Choisir…</option>
              {REFERENTIEL_IMPOTS.map((i) => (
                <option key={i.code} value={i.libelle}>
                  {i.libelle}
                </option>
              ))}
            </Select>
            <Input name="periode" label="Période" placeholder="ex. Juin 2026" required />
            <Input name="montantDu" label="Montant dû (FCFA)" placeholder="0" />
            <Select name="statut" label="Statut" defaultValue="En attente">
              <option value="En attente">En attente</option>
              <option value="Payé">Payé</option>
            </Select>
            <p className="sm:col-span-2 text-xs text-slate-500">
              Le statut « En retard » est appliqué automatiquement après la date d&apos;échéance.
            </p>
          </form>
        </Modal>

        <Fab onClick={() => setShowForm(true)} label="Échéance" />

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Impôt</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3 text-right">Montant dû</th>
                <th className="px-4 py-3 text-right">Reste à payer</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {echeances.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Aucune échéance. Ajoutez-en une ci-dessus
                  </td>
                </tr>
              )}
              {echeances.map((e) => (
                <tr key={e.id} className={e.statut === "En retard" ? "bg-red-50" : ""}>
                  <td className="px-4 py-2">
                    {new Date(e.echeance).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2">{e.impot}</td>
                  <td className="px-4 py-2">{e.periode}</td>
                  <td className="px-4 py-2 text-right">{formatFcfa(e.montantDu)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatFcfa(e.resteAPayer)}
                  </td>
                  <td className="px-4 py-2">
                    {e.statut === "En retard" ? (
                      <span className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-800">
                        En retard
                      </span>
                    ) : (
                      <select
                        value={e.statut}
                        onChange={(ev) => handleStatutChange(e.id, ev.target.value)}
                        className={`rounded border px-2 py-1 text-xs ${
                          e.statut === "Payé"
                            ? "border-mega-300 bg-mega-50 text-mega-800"
                            : "border-amber-300 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <option value="En attente">En attente</option>
                        <option value="Payé">Payé</option>
                      </select>
                    )}
                    {e.statut === "En retard" && (
                      <button
                        type="button"
                        onClick={() => handleStatutChange(e.id, "Payé")}
                        className="ml-2 text-xs text-mega-700 underline"
                      >
                        Marquer payé
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-red-600"
                      onClick={() => handleDelete(e.id)}
                    >
                      Suppr.
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
