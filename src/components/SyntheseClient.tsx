"use client";

import { Button, Card } from "@/components/ui";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import { LigneSynthese } from "@/lib/synthese";

export function SyntheseClient({
  lignes,
  entreprise,
  annee,
  devise,
}: {
  lignes: LigneSynthese[];
  entreprise: string;
  annee: number;
  devise: string;
}) {
  const totaux = lignes.reduce(
    (acc, l) => ({
      entrees: acc.entrees + l.entrees,
      sorties: acc.sorties + l.sorties,
    }),
    { entrees: 0, sorties: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a href="/api/synthese/export" download>
          <Button>Exporter en CSV</Button>
        </a>
      </div>

      <Card className="overflow-x-auto p-0">
        <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
          {entreprise} · Exercice {annee} · Agrégation journal + petite caisse
        </p>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code compte</th>
              <th className="px-4 py-3">Intitulé SYSCOHADA</th>
              <th className="px-4 py-3 text-right">Entrées</th>
              <th className="px-4 py-3 text-right">Sorties</th>
              <th className="px-4 py-3 text-right">Solde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((l) => (
              <tr key={l.codeCompte} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono font-medium">{l.codeCompte}</td>
                <td className="px-4 py-2">{l.intitule}</td>
                <td className="px-4 py-2 text-right text-mega-700">
                  {l.entrees > 0 ? formatFcfa(l.entrees) : ""}
                </td>
                <td className="px-4 py-2 text-right text-red-700">
                  {l.sorties > 0 ? formatFcfa(l.sorties) : ""}
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium ${l.solde < 0 ? "text-red-600" : ""}`}
                >
                  {formatFcfa(l.solde)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <td className="px-4 py-3" colSpan={2}>
                Total général
              </td>
              <td className="px-4 py-3 text-right text-mega-700">
                {formatFcfaLabel(totaux.entrees, devise)}
              </td>
              <td className="px-4 py-3 text-right text-red-700">
                {formatFcfaLabel(totaux.sorties, devise)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatFcfaLabel(totaux.entrees - totaux.sorties, devise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
