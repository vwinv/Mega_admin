import { Card, PageHeader } from "@/components/ui";
import { formatFcfa } from "@/lib/format";
import { getTresorerieMensuelle } from "@/lib/tresorerie";

export const dynamic = "force-dynamic";

function TableauMensuel({
  title,
  lignes,
}: {
  title: string;
  lignes: {
    label: string;
    debut: number;
    entrees: number;
    sorties: number;
    fin: number;
  }[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Mois</th>
              <th className="text-right">Solde début</th>
              <th className="text-right">Entrées</th>
              <th className="text-right">Sorties</th>
              <th className="text-right">Solde fin</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.label} className={l.fin < 0 ? "bg-red-50/80" : ""}>
                <td className="font-medium">{l.label}</td>
                <td className="text-right text-slate-600">{formatFcfa(l.debut)}</td>
                <td className="text-right font-medium text-mega-700">
                  {formatFcfa(l.entrees)}
                </td>
                <td className="text-right font-medium text-red-600">
                  {formatFcfa(l.sorties)}
                </td>
                <td
                  className={`text-right font-semibold ${l.fin < 0 ? "text-red-600" : "text-slate-900"}`}
                >
                  {formatFcfa(l.fin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function TresoreriePage() {
  const data = await getTresorerieMensuelle();
  if (!data) {
    return <p>Base non initialisée.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trésorerie"
        description={`Exercice ${data.params.annee} · tout est calculé automatiquement`}
      />
      <TableauMensuel title="Banque" lignes={data.banque} />
      <TableauMensuel title="Petite caisse" lignes={data.caisse} />
      <TableauMensuel title="Trésorerie totale" lignes={data.total} />
    </div>
  );
}
