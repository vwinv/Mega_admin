"use client";

import { ExternalLink, FileText, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { saveTvaDeclaration } from "@/app/actions/impots";
import {
  Alert,
  Button,
  Card,
  FormActions,
  Input,
  Modal,
} from "@/components/ui";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import { computeTvaDue, TvaMensuelle } from "@/lib/impots-types";

const FORM_ID = "tva-form";

export function TvaCalculator({
  lignes,
  annee,
  devise,
  tauxTVA,
}: {
  lignes: TvaMensuelle[];
  annee: number;
  devise: string;
  tauxTVA: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TvaMensuelle | null>(null);
  const [saving, setSaving] = useState(false);
  const [creditReporte, setCreditReporte] = useState("");

  useEffect(() => {
    if (!editing) return;
    setCreditReporte(
      editing.creditReporte > 0 ? String(editing.creditReporte) : ""
    );
  }, [editing]);

  const previewDue = useMemo(() => {
    if (!editing) return 0;
    const cr =
      Number(String(creditReporte).replace(/\s/g, "").replace(",", ".")) || 0;
    return computeTvaDue(editing.collectee, editing.deductible, cr);
  }, [editing, creditReporte]);

  const totaux = lignes.reduce(
    (acc, l) => ({
      collectee: acc.collectee + l.collectee,
      deductible: acc.deductible + l.deductible,
      tvaDue: acc.tvaDue + l.tvaDue,
    }),
    { collectee: 0, deductible: 0, tvaDue: 0 }
  );

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    await saveTvaDeclaration(
      annee,
      editing.mois,
      String(editing.collectee),
      String(editing.deductible),
      creditReporte
    );
    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  const collectees =
    editing?.factures.filter((f) => f.sens === "collectee") ?? [];
  const deductibles =
    editing?.factures.filter((f) => f.sens === "deductible") ?? [];

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 className="section-title">
            Déclaration TVA mensuelle ({Math.round(tauxTVA * 100)} %)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Collectée et déductible calculées automatiquement (factures + journal
            avec TVA). TVA due = collectée − déductible − crédit reporté.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Mois</th>
                <th className="text-right">Sources</th>
                <th className="text-right">TVA collectée</th>
                <th className="text-right">TVA déductible</th>
                <th className="text-right">Crédit reporté</th>
                <th className="text-right">TVA due</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((t) => (
                <tr key={t.mois}>
                  <td className="font-medium">{t.label}</td>
                  <td className="text-right tabular-nums text-slate-600">
                    {t.factures.length > 0 ? t.factures.length : ""}
                  </td>
                  <td className="text-right tabular-nums text-slate-800">
                    {t.collectee > 0 ? formatFcfa(t.collectee) : ""}
                  </td>
                  <td className="text-right tabular-nums">
                    {t.deductible > 0 ? formatFcfa(t.deductible) : ""}
                  </td>
                  <td className="text-right tabular-nums">
                    {t.creditReporte > 0 ? formatFcfa(t.creditReporte) : ""}
                  </td>
                  <td className="text-right font-semibold text-red-600 tabular-nums">
                    {formatFcfa(
                      computeTvaDue(
                        t.collectee,
                        t.deductible,
                        t.creditReporte
                      )
                    )}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="ghost"
                      className="gap-1 px-2 py-1 text-xs"
                      onClick={() => setEditing(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t.factures.length > 0 ? "Détail" : "Crédit"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3">Total {annee}</td>
                <td className="px-4 py-3 text-right">
                  {lignes.reduce((s, l) => s + l.factures.length, 0) || ""}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatFcfa(totaux.collectee)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatFcfa(totaux.deductible)}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-red-600">
                  {formatFcfaLabel(totaux.tvaDue, devise)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`TVA · ${editing?.label ?? ""} ${annee}`}
        description="Références factures et journal — collectée / déductible auto."
        size="xl"
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={() => setEditing(null)}
            loading={saving}
            submitLabel="Enregistrer le crédit"
          />
        }
      >
        {editing && (
          <div className="space-y-5">
            {editing.factures.length > 0 ? (
              <div className="space-y-4">
                {collectees.length > 0 && (
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">
                        TVA collectée — sources ({collectees.length})
                      </h3>
                      <p className="text-sm text-slate-600">
                        Total :{" "}
                        <strong className="tabular-nums text-mega-800">
                          {formatFcfa(editing.collectee)}
                        </strong>
                      </p>
                    </div>
                    <SourcesTable rows={collectees} />
                  </div>
                )}

                {deductibles.length > 0 && (
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">
                        TVA déductible — journal ({deductibles.length})
                      </h3>
                      <p className="text-sm text-slate-600">
                        Total :{" "}
                        <strong className="tabular-nums text-mega-800">
                          {formatFcfa(editing.deductible)}
                        </strong>
                      </p>
                    </div>
                    <SourcesTable rows={deductibles} />
                  </div>
                )}
              </div>
            ) : (
              <Alert type="info">
                <span className="inline-flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                  Aucune source TVA ce mois. Sélectionnez TVA 18 % sur une
                  écriture journal, ou émettez une facture avec TVA.
                </span>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Collectée (auto)
                </p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatFcfa(editing.collectee)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Déductible (auto)
                </p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatFcfa(editing.deductible)}
                </p>
              </div>
            </div>

            <form id={FORM_ID} onSubmit={handleSave} className="space-y-4">
              <Input
                name="creditReporte"
                label="Crédit reporté (FCFA)"
                value={creditReporte}
                onChange={(e) => setCreditReporte(e.target.value)}
                placeholder="0"
              />
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">TVA due prévisionnelle : </span>
                <span className="font-bold text-red-600 tabular-nums">
                  {formatFcfa(previewDue)}
                </span>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </>
  );
}

function SourcesTable({
  rows,
}: {
  rows: TvaMensuelle["factures"];
}) {
  return (
    <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-left">Référence</th>
            <th className="px-3 py-2 text-left">Libellé / client</th>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-right">HT</th>
            <th className="px-3 py-2 text-right">TVA</th>
            <th className="px-3 py-2 text-right">TTC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((f) => (
            <tr key={`${f.source}-${f.id}`} className="hover:bg-slate-50/80">
              <td className="px-3 py-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    f.source === "FACTURE"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {f.source === "FACTURE" ? "Facture" : "Journal"}
                </span>
              </td>
              <td className="px-3 py-2">
                <Link
                  href={f.href}
                  className="inline-flex items-center gap-1 font-mono font-medium text-mega-700 hover:underline"
                >
                  {f.reference}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </td>
              <td className="max-w-[160px] truncate px-3 py-2">{f.label}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {new Date(f.date).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatFcfa(f.totalHT)}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-mega-800">
                {formatFcfa(f.tva)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatFcfa(f.totalTTC)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-500">
        Journal : montant TTC, TVA extraite au taux sélectionné. Facture : TVA
        calculée sur le HT.
      </p>
    </div>
  );
}
