import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Landmark,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PageHeader, StatCard } from "@/components/ui";
import { getDepenseParCodeBudgetaire } from "@/lib/budget";
import { countAlertes } from "@/lib/controles";
import { formatFcfaLabel } from "@/lib/format";
import { getDonneesGraphiques, getSoldes } from "@/lib/tresorerie";

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    href: "/journal",
    label: "Journal",
    desc: "Saisir une opération",
    icon: Receipt,
    color: "bg-[var(--c-blue-800)]",
  },
  {
    href: "/caisse",
    label: "Petite caisse",
    desc: "Mouvements espèces",
    icon: Wallet,
    color: "bg-[var(--c-blue-600)]",
  },
  {
    href: "/tresorerie",
    label: "Trésorerie",
    desc: "Vue mensuelle",
    icon: Landmark,
    color: "bg-[var(--c-gold-500)]",
  },
  {
    href: "/controle",
    label: "Contrôle",
    desc: "Vérifications",
    icon: ShieldCheck,
    color: "bg-[var(--c-blue-700)]",
  },
];

export default async function FinanceDashboardPage() {
  const soldes = await getSoldes();

  if (!soldes) {
    return (
      <div className="glass-card rounded-2xl border-amber-200/80 bg-amber-50/90 p-8">
        <h1 className="text-xl font-bold text-amber-900">Base vide</h1>
        <p className="mt-2 text-sm text-amber-800">
          Lancez{" "}
          <code className="rounded-lg bg-amber-100 px-2 py-0.5 font-mono text-xs">
            npm run db:seed
          </code>{" "}
          pour importer les données.
        </p>
      </div>
    );
  }

  const { params } = soldes;

  const [graphiques, alertes, enveloppes] = await Promise.all([
    getDonneesGraphiques(),
    countAlertes(),
    getDepenseParCodeBudgetaire(),
  ]);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description={`${params.entreprise} · Exercice ${params.annee}`}
      />

      {alertes > 0 && (
        <Link
          href="/controle"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {alertes} alerte{alertes > 1 ? "s" : ""} de contrôle
            </p>
            <p className="text-sm text-amber-700">
              Consultez le module Contrôle financier pour les détails
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-amber-500" />
        </Link>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-xs)] transition-all hover:border-[var(--c-blue-300)] hover:shadow-[var(--shadow-sm)]"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${link.color} shadow-sm`}
              >
                <Icon
                  className={`h-5 w-5 ${link.href === "/tresorerie" ? "text-[var(--c-blue-950)]" : "text-white"}`}
                  strokeWidth={2}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--foreground)]">{link.label}</p>
                <p className="text-xs text-[var(--muted)]">{link.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--c-stone-300)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--c-blue-600)]" />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Trésorerie totale"
          value={formatFcfaLabel(soldes.tresorerieTotale, params.devise)}
          variant="inverse"
          hint="Banque + mobile money + caisse"
        />
        <StatCard
          label="Solde banque"
          value={formatFcfaLabel(soldes.soldeBanque, params.devise)}
        />
        <StatCard
          label="Solde petite caisse"
          value={formatFcfaLabel(soldes.soldeCaisse, params.devise)}
        />
        <StatCard
          label="Résultat (entrées − sorties)"
          value={formatFcfaLabel(soldes.resultat, params.devise)}
          variant={soldes.resultat >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Entrées de l'année"
          value={formatFcfaLabel(soldes.entreesAnnee, params.devise)}
          variant="positive"
        />
        <StatCard
          label="Sorties de l'année"
          value={formatFcfaLabel(soldes.sortiesAnnee, params.devise)}
          variant="negative"
        />
        <StatCard
          label="Alertes de contrôle"
          value={String(alertes)}
          variant={alertes > 0 ? "warning" : "positive"}
          hint="Voir module Contrôle financier"
        />
        <StatCard
          label="Plafond caisse"
          value={formatFcfaLabel(params.plafondCaisse, params.devise)}
          variant={
            soldes.soldeCaisse > params.plafondCaisse ? "warning" : "default"
          }
        />
      </div>

      {graphiques && (
        <DashboardCharts
          fluxMensuel={graphiques.fluxMensuel}
          evolution={graphiques.evolution}
          enveloppes={enveloppes.map((e) => ({
            code: e.code,
            beneficiaire: e.beneficiaire,
            enveloppe: e.enveloppe,
            depense: e.depense,
          }))}
        />
      )}
    </div>
  );
}
