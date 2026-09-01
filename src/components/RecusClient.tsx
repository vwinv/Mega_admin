"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  creerRecuHistorique,
  type FactureRecuOption,
  type RecuListRow,
} from "@/app/actions/facturation";
import { formatFcfaLabel } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/constants";
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

const FORM_ID = "recu-historique-form";

export function RecusClient({
  recus,
  factures,
  canEdit,
}: {
  recus: RecuListRow[];
  factures: FactureRecuOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filtre, setFiltre] = useState("");
  const [factureId, setFactureId] = useState(factures[0]?.id ?? "");
  const [ajusterMontantPaye, setAjusterMontantPaye] = useState(false);

  const factureSel = factures.find((f) => f.id === factureId);

  const filtered = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    if (!q) return recus;
    return recus.filter(
      (r) =>
        r.clientNom.toLowerCase().includes(q) ||
        r.factureNumero.toLowerCase().includes(q) ||
        (r.factureTitre?.toLowerCase().includes(q) ?? false) ||
        (r.numeroPiece?.toLowerCase().includes(q) ?? false)
    );
  }, [recus, filtre]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factureId) {
      setError("Choisissez une facture.");
      return;
    }
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const result = await creerRecuHistorique({
      factureId,
      montant: parseInt(String(fd.get("montant")), 10) || 0,
      datePaiement: String(fd.get("date") ?? ""),
      modePaiement: String(fd.get("mode") ?? "") || undefined,
      numeroPiece: String(fd.get("numeroPiece") ?? "") || undefined,
      observations: String(fd.get("observations") ?? "") || undefined,
      ajusterMontantPaye,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowCreate(false);
    router.push(`/facturation/recus/${result.operationId}`);
  }

  return (
    <div className="space-y-6">
      <Alert type="info">
        Les reçus générés depuis une <strong>tranche de paiement</strong> sur
        une facture apparaissent ici automatiquement. Pour les paiements
        antérieurs au site, utilisez{" "}
        <strong>Reçu paiement antérieur</strong> : le document est créé{" "}
        <strong>sans nouvelle écriture de trésorerie</strong>.
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          label="Rechercher"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          placeholder="Client, n° facture, n° pièce…"
          className="max-w-sm"
        />
        {canEdit && (
          <Button onClick={() => setShowCreate(true)}>
            Reçu paiement antérieur
          </Button>
        )}
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Facture</th>
                <th className="px-4 py-3">Tranche</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Aucun reçu pour le moment.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">{r.clientNom}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/facturation/factures/${r.factureId}`}
                        className="font-mono font-medium text-mega-700 hover:underline"
                      >
                        {r.factureNumero}
                      </Link>
                      {r.factureTitre && (
                        <p className="text-xs text-slate-500">{r.factureTitre}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.tranche}
                      {r.totalTranches > 1 ? ` / ${r.totalTranches}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatFcfaLabel(r.montant)}
                    </td>
                    <td className="px-4 py-3">
                      {r.historique ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Antérieur
                        </span>
                      ) : (
                        <span className="rounded-full bg-mega-100 px-2 py-0.5 text-xs font-medium text-mega-800">
                          Trésorerie
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/facturation/recus/${r.id}`}
                        className="text-mega-700 hover:underline"
                      >
                        Voir / imprimer
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {canEdit && (
        <Fab
          onClick={() => setShowCreate(true)}
          label="Reçu antérieur"
          aria-label="Créer un reçu pour paiement antérieur"
        />
      )}

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setError(null);
        }}
        title="Reçu pour paiement antérieur"
        description="Document de régularisation pour un paiement déjà effectué avant la mise en service du site."
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={() => setShowCreate(false)}
            submitLabel={saving ? "Création…" : "Créer et ouvrir le reçu"}
            loading={saving}
          />
        }
      >
        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}
        <form id={FORM_ID} onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Facture"
            value={factureId}
            onChange={(e) => {
              setFactureId(e.target.value);
              const f = factures.find((x) => x.id === e.target.value);
              setAjusterMontantPaye((f?.montantPaye ?? 0) === 0);
            }}
            required
          >
            <option value="">Choisir</option>
            {factures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.numero} · {f.clientNom}
                {f.titre ? ` · ${f.titre}` : ""}
              </option>
            ))}
          </Select>

          {factureSel && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Total facture {formatFcfaLabel(factureSel.totalGeneral)} · Payé{" "}
              {formatFcfaLabel(factureSel.montantPaye)} · Reçus existants :{" "}
              {factureSel.nbRecus}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Montant (FCFA)"
              name="montant"
              type="number"
              min={1}
              required
            />
            <Input
              label="Date du paiement"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Mode de paiement" name="mode">
              <option value="">—</option>
              {MODES_PAIEMENT.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input
              label="N° de pièce (optionnel)"
              name="numeroPiece"
              placeholder="Laisser vide pour auto"
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Observations (optionnel)
            </span>
            <textarea
              name="observations"
              rows={2}
              placeholder="Référence chèque, virement, etc."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ajusterMontantPaye}
              onChange={(e) => setAjusterMontantPaye(e.target.checked)}
              className="mt-1"
            />
            <span>
              <strong>Mettre à jour le montant payé</strong> sur la facture
              (somme de tous les reçus). À cocher si la facture n&apos;indique
              pas encore les paiements reçus.
            </span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
