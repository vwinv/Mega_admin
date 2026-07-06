"use client";

import { useRouter } from "next/navigation";
import { saveChecklistItem, saveRapprochement } from "@/app/actions/controle";
import { Card, StatCard } from "@/components/ui";
import { CHECKLIST_TACHES, Controle, RECOMMANDATIONS } from "@/lib/controle-helpers";
import { formatFcfa } from "@/lib/format";
import { LigneRapprochement } from "@/lib/rapprochement-types";

const MOIS_COURTS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

export function ControleClient({
  controles,
  rapprochements,
  checklist,
  annee,
}: {
  controles: Controle[];
  rapprochements: LigneRapprochement[];
  checklist: { mois: number; tacheId: number; statut: string }[];
  annee: number;
}) {
  const router = useRouter();
  const alertes = controles.filter((c) => c.statut === "ALERTE").length;

  function getStatut(mois: number, tacheId: number) {
    return (
      checklist.find((c) => c.mois === mois && c.tacheId === tacheId)?.statut ??
      "À faire"
    );
  }

  async function handleRapprochement(mois: number, value: string) {
    await saveRapprochement(annee, mois, value);
    router.refresh();
  }

  async function handleChecklist(mois: number, tacheId: number, statut: string) {
    await saveChecklistItem(annee, mois, tacheId, statut);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Contrôles OK"
          value={String(controles.filter((c) => c.statut === "OK").length)}
          variant="positive"
        />
        <StatCard
          label="Alertes"
          value={String(alertes)}
          variant={alertes > 0 ? "negative" : "positive"}
        />
        <StatCard
          label="Total contrôles"
          value="13"
        />
      </div>

      <Card>
        <h2 className="section-title mb-4">13 contrôles automatiques</h2>
        <div className="space-y-3">
          {controles.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                c.statut === "ALERTE"
                  ? "border-red-200/80 bg-gradient-to-r from-red-50/90 to-white"
                  : "border-mega-200/80 bg-gradient-to-r from-mega-50/90 to-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    {c.id}. {c.libelle}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{c.detail}</p>
                  {c.statut === "ALERTE" && RECOMMANDATIONS[c.id] && (
                    <p className="mt-2 text-sm font-medium text-red-800">
                      → {RECOMMANDATIONS[c.id]}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    c.statut === "ALERTE"
                      ? "bg-red-200 text-red-800"
                      : "bg-mega-200 text-mega-800"
                  }`}
                >
                  {c.statut}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 className="section-title">Rapprochement bancaire mensuel</h2>
          <p className="mt-1 text-xs text-slate-500">
            Saisissez le solde du relevé bancaire. L&apos;écart est calculé automatiquement
          </p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-2">Mois</th>
              <th className="px-4 py-2 text-right">Solde calculé</th>
              <th className="px-4 py-2 text-right">Solde relevé</th>
              <th className="px-4 py-2 text-right">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rapprochements.map((r) => (
              <tr key={r.mois} className={r.ecart !== null && r.ecart !== 0 ? "bg-amber-50" : ""}>
                <td className="px-4 py-2 font-medium">{r.label}</td>
                <td className="px-4 py-2 text-right">{formatFcfa(r.soldeCalcule)}</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    defaultValue={r.soldeReleve !== null ? String(r.soldeReleve) : ""}
                    placeholder="Solde relevé"
                    className="w-32 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                    onBlur={(e) => handleRapprochement(r.mois, e.target.value)}
                  />
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    r.ecart !== null && r.ecart !== 0 ? "text-amber-700" : ""
                  }`}
                >
                  {r.ecart !== null ? formatFcfa(r.ecart) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 className="section-title">Checklist mensuelle ({annee})</h2>
          <p className="mt-1 text-xs text-slate-500">
            11 tâches × 12 mois · Fait / À faire / N/A
          </p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left min-w-[200px]">
                Tâche
              </th>
              {MOIS_COURTS.map((m) => (
                <th key={m} className="px-1 py-2 text-center min-w-[60px]">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CHECKLIST_TACHES.map((tache) => (
              <tr key={tache.id}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium">
                  {tache.libelle}
                </td>
                {Array.from({ length: 12 }, (_, i) => {
                  const mois = i + 1;
                  const statut = getStatut(mois, tache.id);
                  return (
                    <td key={mois} className="px-1 py-1 text-center">
                      <select
                        value={statut}
                        onChange={(e) =>
                          handleChecklist(mois, tache.id, e.target.value)
                        }
                        className={`w-full rounded border px-0.5 py-0.5 text-xs ${
                          statut === "Fait"
                            ? "border-mega-300 bg-mega-50 text-mega-800"
                            : statut === "N/A"
                              ? "border-slate-200 bg-slate-100 text-slate-500"
                              : "border-amber-300 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <option value="À faire">À faire</option>
                        <option value="Fait">Fait</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
