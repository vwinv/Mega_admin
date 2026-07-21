"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DevisRow, FactureRow } from "@/app/actions/facturation";
import { formatFcfaLabel } from "@/lib/format";
import {
  STATUT_DEVIS_LABELS,
  STATUT_FACTURE_LABELS,
} from "@/lib/facturation";
import { STATUT_APPROBATION_LABELS } from "@/lib/approbation";
import { Alert, Button, Card, Fab } from "@/components/ui";

type Tab = "devis" | "factures";

export function FacturationClient({
  stats,
  devis,
  factures,
  canEdit,
}: {
  stats: {
    facture: number;
    encaisse: number;
    enAttente: number;
    devisCount: number;
    facturesCount: number;
  };
  devis: DevisRow[];
  factures: FactureRow[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<Tab>("devis");
  const router = useRouter();

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "devis", label: "Devis", count: stats.devisCount },
    { id: "factures", label: "Factures", count: stats.facturesCount },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total facturé
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatFcfaLabel(stats.facture)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Encaissé
          </p>
          <p className="mt-1 text-2xl font-bold text-mega-700">
            {formatFcfaLabel(stats.encaisse)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            En attente
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {formatFcfaLabel(stats.enAttente)}
          </p>
        </Card>
      </div>

      <Alert type="info">
        <strong>Facturation :</strong> créez une facture avec un{" "}
        <strong>n° saisi manuellement</strong>, puis archivez le PDF ou le scan
        sur la fiche facture (section « Archivage · pièces comptables »). Le
        journal attribue automatiquement les n° de pièce{" "}
        <span className="font-mono">BN-…</span>. Les clients se gèrent dans
        le menu <Link href="/clients" className="font-medium underline">Clients</Link>.
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-mega-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-80">({t.count})</span>
            </button>
          ))}
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link href="/facturation/devis/nouveau">
              <Button>+ Devis</Button>
            </Link>
            <Link href="/facturation/factures/nouveau">
              <Button variant="secondary">+ Facture</Button>
            </Link>
          </div>
        )}
      </div>

      {tab === "devis" && (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Titre</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total HT</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {devis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Aucun devis. Créez votre premier devis.
                    </td>
                  </tr>
                ) : (
                  devis.map((d) => (
                    <tr key={d.id}>
                      <td className="font-mono text-xs">{d.numero}</td>
                      <td className="max-w-[200px] truncate font-medium">
                        {d.titre}
                      </td>
                      <td>{d.clientNom}</td>
                      <td>{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                      <td>{formatFcfaLabel(d.totalHT)}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {STATUT_DEVIS_LABELS[d.statut] ?? d.statut}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/facturation/devis/${d.id}`}
                          className="text-sm font-medium text-mega-700 hover:underline"
                        >
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "factures" && (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total TTC</th>
                  <th>Total général</th>
                  <th>Reste</th>
                  <th>Statut</th>
                  <th>CEO</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {factures.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Aucune facture.
                    </td>
                  </tr>
                ) : (
                  factures.map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono text-xs">{f.numero}</td>
                      <td>{f.clientNom}</td>
                      <td>{new Date(f.date).toLocaleDateString("fr-FR")}</td>
                      <td>{formatFcfaLabel(f.totalTTC)}</td>
                      <td>{formatFcfaLabel(f.totalGeneral)}</td>
                      <td
                        className={
                          f.resteAPayer > 0 ? "font-medium text-amber-700" : ""
                        }
                      >
                        {formatFcfaLabel(f.resteAPayer)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            f.statut === "PAYE"
                              ? "badge-ok"
                              : f.resteAPayer > 0
                                ? "badge-alert"
                                : "badge-neutral"
                          }`}
                        >
                          {STATUT_FACTURE_LABELS[f.statut] ?? f.statut}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            f.statutApprobation === "APPROUVE"
                              ? "badge-ok"
                              : f.statutApprobation === "REFUSE"
                                ? "badge-alert"
                                : "badge-neutral"
                          }`}
                        >
                          {STATUT_APPROBATION_LABELS[
                            f.statutApprobation as keyof typeof STATUT_APPROBATION_LABELS
                          ] ?? f.statutApprobation}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/facturation/factures/${f.id}`}
                          className="text-sm font-medium text-mega-700 hover:underline"
                        >
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {canEdit && (
        <Fab
          onClick={() => {
            if (tab === "factures")
              router.push("/facturation/factures/nouveau");
            else router.push("/facturation/devis/nouveau");
          }}
          label={tab === "factures" ? "Nouvelle facture" : "Nouveau devis"}
        />
      )}
    </div>
  );
}
