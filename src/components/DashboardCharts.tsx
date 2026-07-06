"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";
import { formatFcfa } from "@/lib/format";

type FluxMensuel = { mois: string; entrees: number; sorties: number };
type Evolution = { mois: string; tresorerie: number };
type Enveloppe = {
  code: string;
  beneficiaire: string;
  enveloppe: number;
  depense: number;
};

const chartTooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: "13px",
};

function ChartHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="section-title">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

export function DashboardCharts({
  fluxMensuel,
  evolution,
  enveloppes,
}: {
  fluxMensuel: FluxMensuel[];
  evolution: Evolution[];
  enveloppes: Enveloppe[];
}) {
  const fmt = (v: number) => formatFcfa(v);

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <Card>
        <ChartHeader
          title="Entrées vs sorties"
          subtitle="Flux mensuels de l'exercice"
        />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fluxMensuel} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="mois"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              contentStyle={chartTooltipStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Bar dataKey="entrees" name="Entrées" fill="#059669" radius={[6, 6, 0, 0]} />
            <Bar dataKey="sorties" name="Sorties" fill="#f87171" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <ChartHeader
          title="Évolution trésorerie"
          subtitle="Solde cumulé banque + caisse"
        />
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="mois"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              contentStyle={chartTooltipStyle}
            />
            <Line
              type="monotone"
              dataKey="tresorerie"
              name="Trésorerie"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ fill: "#059669", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#047857" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="lg:col-span-2">
        <ChartHeader
          title="Enveloppes budgétaires"
          subtitle="Comparaison enveloppe allouée vs dépensé par code"
        />
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={enveloppes.filter((e) => e.enveloppe > 0 || e.depense > 0)}
            layout="vertical"
            margin={{ left: 8, right: 16 }}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="code"
              tick={{ fontSize: 11, fill: "#64748b" }}
              width={72}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              contentStyle={chartTooltipStyle}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Bar dataKey="enveloppe" name="Enveloppe" fill="#94a3b8" radius={[0, 4, 4, 0]} />
            <Bar dataKey="depense" name="Dépensé" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
