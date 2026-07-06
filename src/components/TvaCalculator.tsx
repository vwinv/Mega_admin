"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveTvaDeclaration } from "@/app/actions/impots";
import {
  Button,
  Card,
  FormActions,
  Input,
  Modal,
} from "@/components/ui";
import { computeTvaDue } from "@/lib/impots-types";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import { TvaMensuelle } from "@/lib/impots-types";

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
    const fd = new FormData(e.currentTarget);
    await saveTvaDeclaration(
      annee,
      editing.mois,
      fd.get("collectee") as string,
      fd.get("deductible") as string,
      fd.get("creditReporte") as string
    );
    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 className="section-title">
            Déclaration TVA mensuelle ({Math.round(tauxTVA * 100)} %)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cliquez sur un mois pour saisir. TVA due = collectée − déductible − crédit reporté
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Mois</th>
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
                  <td className="text-right tabular-nums">
                    {t.collectee > 0 ? formatFcfa(t.collectee) : ""}
                  </td>
                  <td className="text-right tabular-nums">
                    {t.deductible > 0 ? formatFcfa(t.deductible) : ""}
                  </td>
                  <td className="text-right tabular-nums">
                    {t.creditReporte > 0 ? formatFcfa(t.creditReporte) : ""}
                  </td>
                  <td className="text-right font-semibold text-red-600 tabular-nums">
                    {formatFcfa(computeTvaDue(t.collectee, t.deductible, t.creditReporte))}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="ghost"
                      className="gap-1 px-2 py-1 text-xs"
                      onClick={() => setEditing(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Saisir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3">Total {annee}</td>
                <td className="px-4 py-3 text-right">{formatFcfa(totaux.collectee)}</td>
                <td className="px-4 py-3 text-right">{formatFcfa(totaux.deductible)}</td>
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
        size="md"
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        }
      >
        {editing && (
          <form id={FORM_ID} onSubmit={handleSave} className="space-y-4">
            <Input
              name="collectee"
              label="TVA collectée (FCFA)"
              defaultValue={editing.collectee > 0 ? String(editing.collectee) : ""}
              placeholder="0"
            />
            <Input
              name="deductible"
              label="TVA déductible (FCFA)"
              defaultValue={editing.deductible > 0 ? String(editing.deductible) : ""}
              placeholder="0"
            />
            <Input
              name="creditReporte"
              label="Crédit reporté (FCFA)"
              defaultValue={editing.creditReporte > 0 ? String(editing.creditReporte) : ""}
              placeholder="0"
            />
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">TVA due prévisionnelle : </span>
              <span className="font-bold text-red-600">
                {formatFcfa(
                  computeTvaDue(editing.collectee, editing.deductible, editing.creditReporte)
                )}
              </span>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
