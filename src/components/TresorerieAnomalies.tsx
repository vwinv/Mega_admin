"use client";

import { AlertTriangle, Banknote, ExternalLink, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteOperationCaisse } from "@/app/actions/caisse";
import { Alert, Button, Card } from "@/components/ui";
import { formatFcfa } from "@/lib/format";
import type { AnomalieTresorerie } from "@/lib/tresorerie";

export function TresorerieAnomalies({
  anomalies,
}: {
  anomalies: AnomalieTresorerie[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (anomalies.length === 0) return null;

  async function handleCorrection(a: AnomalieTresorerie) {
    if (!a.correction) return;
    setError(null);

    if (a.correction.action === "supprimer_caisse") {
      const ok = confirm(
        `Retirer cette écriture de la petite caisse ?\n\nMontant : ${a.montant.toLocaleString("fr-FR")} FCFA\nBanque conservée : ${a.contrepartie?.reference ?? ""}`
      );
      if (!ok) return;
      setBusyId(a.id);
      const result = await deleteOperationCaisse(a.correction.targetId);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      return;
    }

    router.push(a.href);
  }

  return (
    <Card className="overflow-hidden border-amber-200/80 p-0">
      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
        <h2 className="flex items-center gap-2 section-title text-amber-950">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Écritures à vérifier ({anomalies.length})
        </h2>
        <p className="mt-1 text-sm text-amber-900/70">
          Identification banque vs petite caisse : corrigez les saisies en
          double ou mal classées.
        </p>
      </div>

      <div className="space-y-3 p-4">
        {error && <Alert type="error">{error}</Alert>}

        {anomalies.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border p-4 ${
              a.severity === "error"
                ? "border-red-200 bg-red-50/50"
                : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded px-1.5 py-0.5 font-semibold ${
                      a.compte === "caisse"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {a.compte === "caisse" ? (
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3 w-3" /> Petite caisse
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3 w-3" /> Banque
                      </span>
                    )}
                  </span>
                  <Link
                    href={a.href}
                    className="inline-flex items-center gap-1 font-mono font-medium text-mega-700 hover:underline"
                  >
                    {a.reference}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {a.date && (
                    <span className="text-slate-500">
                      {new Date(a.date).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatFcfa(a.montant)} FCFA
                  </span>
                </div>

                <p className="text-sm text-slate-700">{a.message}</p>

                {a.contrepartie && (
                  <p className="text-xs text-slate-600">
                    Correctement sur{" "}
                    <strong>
                      {a.contrepartie.compte === "banque"
                        ? "banque"
                        : "petite caisse"}
                    </strong>
                    {" · "}
                    <Link
                      href={a.contrepartie.href}
                      className="font-mono text-mega-700 hover:underline"
                    >
                      {a.contrepartie.reference}
                    </Link>
                  </p>
                )}
              </div>

              {a.correction && (
                <Button
                  variant={
                    a.correction.action === "supprimer_caisse"
                      ? "danger"
                      : "secondary"
                  }
                  className="shrink-0 gap-1.5 text-xs"
                  disabled={busyId === a.id}
                  onClick={() => handleCorrection(a)}
                >
                  {a.correction.action === "supprimer_caisse" ? (
                    <Trash2 className="h-3.5 w-3.5" />
                  ) : null}
                  {busyId === a.id ? "…" : a.correction.label}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
