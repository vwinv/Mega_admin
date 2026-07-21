"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteFacture,
  enregistrerPaiementFacture,
  saveFacture,
  type ClientRow,
  type PaiementTrancheRow,
} from "@/app/actions/facturation";
import { FacturePrintView } from "@/components/FacturationPrint";
import { PiecesComptablesPanel } from "@/components/PiecesComptablesPanel";
import type { PieceComptableRow } from "@/app/actions/pieces-comptables";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/constants";
import {
  STATUTS_FACTURE,
  STATUT_FACTURE_LABELS,
  computeTotauxFacture,
  type LigneDoc,
} from "@/lib/facturation";
import { STATUT_APPROBATION_LABELS } from "@/lib/approbation";
import {
  Alert,
  Button,
  Card,
  FormActions,
  Input,
  Modal,
  Select,
} from "@/components/ui";

function emptyLigne(ordre: number): LigneDoc {
  return {
    ordre,
    designation: "",
    details: [],
    prix: 0,
    styleAccent: false,
  };
}

function Textarea({
  label,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      )}
      <textarea
        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-mega-500 focus:outline-none focus:ring-4 focus:ring-mega-500/10 ${className}`}
        {...props}
      />
    </label>
  );
}

function LigneEditor({
  ligne,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  ligne: LigneDoc;
  index: number;
  onChange: (l: LigneDoc) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const detailsText = ligne.details.join("\n");

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">
          Ligne {index + 1}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={ligne.styleAccent}
              onChange={(e) => onChange({ ...ligne, styleAccent: e.target.checked })}
            />
            Style accent MEGA
          </label>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-600 hover:underline"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Désignation"
          value={ligne.designation}
          onChange={(e) => onChange({ ...ligne, designation: e.target.value })}
        />
        <Input
          label="Prix (FCFA)"
          type="number"
          min={0}
          value={ligne.prix || ""}
          onChange={(e) =>
            onChange({ ...ligne, prix: parseInt(e.target.value, 10) || 0 })
          }
        />
      </div>
      <div className="mt-3">
        <Textarea
          label="Sous-points (un par ligne)"
          rows={4}
          value={detailsText}
          onChange={(e) =>
            onChange({
              ...ligne,
              details: e.target.value.split("\n").filter((s) => s.trim()),
            })
          }
        />
      </div>
    </div>
  );
}

export function FactureDetailClient({
  facture,
  clients,
  pieces,
  paiements = [],
  canEdit,
}: {
  facture: {
    id?: string;
    numero?: string;
    titre?: string | null;
    date: string;
    statut: string;
    notes?: string | null;
    clientId: string;
    reliquat: number;
    reliquatLabel: string;
    tauxTVA: number;
    montantPaye: number;
    datePaiement?: string | null;
    operationId?: string | null;
    statutApprobation: string;
    motifRefus?: string | null;
    devis?: { numero: string; titre: string } | null;
    lignes: LigneDoc[];
    totaux: ReturnType<typeof computeTotauxFacture>;
    entreprise: {
      entreprise: string;
      emailContact?: string;
      telephoneContact?: string;
    } | null;
    clientNom?: string;
  };
  clients: ClientRow[];
  pieces: PieceComptableRow[];
  paiements?: PaiementTrancheRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const isNew = !facture.id;
  const [editMode, setEditMode] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [numero, setNumero] = useState(facture.numero ?? "");
  const [titre, setTitre] = useState(facture.titre ?? "");
  const [date, setDate] = useState(facture.date.slice(0, 10));
  const [clientId, setClientId] = useState(facture.clientId);
  const [statut, setStatut] = useState(facture.statut);
  const [notes, setNotes] = useState(facture.notes ?? "");
  const [reliquat, setReliquat] = useState(String(facture.reliquat));
  const [reliquatLabel, setReliquatLabel] = useState(
    facture.reliquatLabel || "Reliquat"
  );
  const [lignes, setLignes] = useState<LigneDoc[]>(
    facture.lignes.length > 0 ? facture.lignes : [emptyLigne(0)]
  );
  const [showPay, setShowPay] = useState(false);
  const [payMontant, setPayMontant] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState("");
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const clientNom =
    facture.clientNom ?? clients.find((c) => c.id === clientId)?.nom ?? "";
  const rel = parseInt(reliquat, 10) || 0;
  const totaux = computeTotauxFacture(
    lignes,
    rel,
    facture.tauxTVA,
    facture.montantPaye
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveFacture({
      id: facture.id,
      numero,
      titre,
      date,
      clientId,
      statut,
      notes,
      reliquat: rel,
      reliquatLabel,
      lignes: lignes.map((l, i) => ({ ...l, ordre: i })),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (isNew) router.replace(`/facturation/factures/${result.id}`);
    else {
      setEditMode(false);
      router.refresh();
    }
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!facture.id) return;
    setError(null);
    setPaying(true);
    const montant = parseInt(payMontant, 10) || 0;
    const result = await enregistrerPaiementFacture(
      facture.id,
      montant,
      payDate,
      payMode || undefined
    );
    setPaying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowPay(false);
    router.push(
      `/facturation/factures/${facture.id}/recu/${result.operationId}`
    );
  }

  async function handleDelete() {
    if (!facture.id) return;
    const msg =
      facture.montantPaye > 0
        ? `Supprimer la facture ${facture.numero} ?\n\nLes écritures de paiement au journal seront également supprimées.`
        : `Supprimer la facture ${facture.numero} ?`;
    if (!confirm(msg)) return;

    setError(null);
    setDeleting(true);
    const result = await deleteFacture(facture.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/facturation");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/facturation"
          className="text-sm text-slate-600 hover:text-mega-700"
        >
          ← Retour facturation
        </Link>
        <div className="flex flex-wrap gap-2">
          {!isNew && totaux.tva > 0 && facture.statut !== "BROUILLON" && facture.statut !== "ANNULE" && (
            <Link
              href="/impots"
              className="inline-flex items-center rounded-lg border border-mega-200 bg-mega-50 px-3 py-1.5 text-xs font-medium text-mega-800 hover:bg-mega-100"
            >
              TVA {formatFcfa(totaux.tva)} · déclaration{" "}
              {new Date(facture.date).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </Link>
          )}
          {!isNew && (
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimer
            </Button>
          )}
          {canEdit && !isNew && !editMode && totaux.resteAPayer > 0 && facture.statutApprobation === "APPROUVE" && (
            <Button onClick={() => setShowPay(true)}>
              Enregistrer une tranche
            </Button>
          )}
          {canEdit && !isNew && !editMode && (
            <Button variant="secondary" onClick={() => setEditMode(true)}>
              Modifier
            </Button>
          )}
          {canEdit && !isNew && !editMode && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          )}
        </div>
      </div>

      {!isNew && (
        <Card className="no-print !p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-slate-500">N° facture</p>
              <p className="font-mono text-lg font-bold text-mega-800">
                {facture.numero}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Statut</p>
              <p className="font-semibold">
                {STATUT_FACTURE_LABELS[facture.statut] ?? facture.statut}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Approbation CEO</p>
              <p
                className={`font-semibold ${
                  facture.statutApprobation === "APPROUVE"
                    ? "text-mega-700"
                    : facture.statutApprobation === "REFUSE"
                      ? "text-red-700"
                      : "text-amber-700"
                }`}
              >
                {STATUT_APPROBATION_LABELS[
                  facture.statutApprobation as keyof typeof STATUT_APPROBATION_LABELS
                ] ?? facture.statutApprobation}
              </p>
              {facture.motifRefus && (
                <p className="mt-0.5 text-xs text-red-600">{facture.motifRefus}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Total général</p>
              <p className="font-semibold">{formatFcfaLabel(totaux.totalGeneral)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Payé</p>
              <p className="font-semibold text-mega-700">
                {formatFcfaLabel(facture.montantPaye)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reste à payer</p>
              <p
                className={`font-semibold ${
                  totaux.resteAPayer > 0 ? "text-amber-700" : "text-mega-700"
                }`}
              >
                {formatFcfaLabel(totaux.resteAPayer)}
              </p>
            </div>
            {facture.devis && (
              <div>
                <p className="text-xs text-slate-500">Devis d&apos;origine</p>
                <p className="font-semibold">
                  N°{facture.devis.numero} · {facture.devis.titre}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {!isNew && paiements.length > 0 && (
        <Card className="no-print overflow-hidden !p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">
              Paiements par tranches
            </h3>
            <p className="text-xs text-slate-500">
              {paiements.length} tranche{paiements.length > 1 ? "s" : ""} ·{" "}
              {formatFcfaLabel(facture.montantPaye)} encaissés · reste{" "}
              {formatFcfaLabel(totaux.resteAPayer)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>Tranche</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>N° pièce</th>
                  <th>Mode</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">#{p.tranche}</td>
                    <td>{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                    <td className="font-semibold text-mega-700">
                      {formatFcfaLabel(p.montant)}
                    </td>
                    <td className="font-mono text-xs">{p.numeroPiece ?? "—"}</td>
                    <td>{p.modePaiement ?? "—"}</td>
                    <td>
                      <Link
                        href={`/facturation/factures/${facture.id}/recu/${p.id}`}
                        className="text-sm font-medium text-mega-700 hover:underline"
                      >
                        Reçu
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {isNew && (
        <Alert type="info">
          Saisissez le <strong>n° de facture manuellement</strong> (ex. F2026-0042),
          puis enregistrez. Vous pourrez ensuite joindre des pièces comptables
          (PDF, scan…).
        </Alert>
      )}

      {!isNew && facture.id && (
        <PiecesComptablesPanel
          factureId={facture.id}
          pieces={pieces}
          canEdit={canEdit}
        />
      )}

      {!isNew && facture.statutApprobation === "EN_ATTENTE_CEO" && (
        <Alert type="info">
          Cette facture est en attente d&apos;approbation par la CEO. Le paiement
          sera possible après validation dans Approbations CEO.
        </Alert>
      )}

      {editMode && canEdit ? (
        <Card>
          <form id="facture-form" onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="N° facture"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="ex. F2026-0042"
                required
              />
              <Input
                label="Titre (optionnel)"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
              />
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Select
                label="Client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Choisir</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </Select>
              {!isNew && (
                <Select
                  label="Statut"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value)}
                >
                  {STATUTS_FACTURE.map((s) => (
                    <option key={s} value={s}>
                      {STATUT_FACTURE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="font-semibold text-slate-900">
                Précédent reliquat
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Affiché sur la facture générée en section{" "}
                <strong>2 - Rappel Facture initiale</strong>, puis intégré au{" "}
                <strong>Total General</strong> (reliquat + TTC).
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input
                  label="Montant (FCFA)"
                  type="number"
                  min={0}
                  step={1}
                  value={reliquat}
                  onChange={(e) => setReliquat(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Libellé affiché"
                  value={reliquatLabel}
                  onChange={(e) => setReliquatLabel(e.target.value)}
                  placeholder="Reliquat"
                />
              </div>
              {rel > 0 && (
                <p className="mt-3 text-sm font-medium text-amber-800">
                  {reliquatLabel || "Reliquat"} : {formatFcfaLabel(rel)} →
                  Total général {formatFcfaLabel(totaux.totalGeneral)}
                </p>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Lignes</h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setLignes([...lignes, emptyLigne(lignes.length)])
                  }
                >
                  + Ligne
                </Button>
              </div>
              <div className="space-y-4">
                {lignes.map((l, i) => (
                  <LigneEditor
                    key={i}
                    ligne={l}
                    index={i}
                    canRemove={lignes.length > 1}
                    onChange={(nl) => {
                      const next = [...lignes];
                      next[i] = nl;
                      setLignes(next);
                    }}
                    onRemove={() => setLignes(lignes.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
              <div className="mt-4 space-y-1 text-right text-sm">
                <p>HT : {formatFcfaLabel(totaux.totalHT)}</p>
                <p>TVA : {formatFcfaLabel(totaux.tva)}</p>
                <p className="font-semibold">
                  TTC : {formatFcfaLabel(totaux.totalTTC)}
                </p>
                {rel > 0 && (
                  <>
                    <p>
                      {reliquatLabel || "Reliquat"} :{" "}
                      {formatFcfaLabel(rel)}
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      Total général : {formatFcfaLabel(totaux.totalGeneral)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <Textarea
              label="Notes internes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <FormActions
              formId="facture-form"
              onCancel={() =>
                isNew ? router.push("/facturation") : setEditMode(false)
              }
              submitLabel={saving ? "Enregistrement…" : "Enregistrer"}
              loading={saving}
            />
          </form>
        </Card>
      ) : (
        <FacturePrintView
          numero={facture.numero ?? ""}
          titre={titre || null}
          date={date}
          clientNom={clientNom}
          lignes={lignes}
          reliquat={rel}
          reliquatLabel={reliquatLabel}
          tauxTVA={facture.tauxTVA}
          totaux={totaux}
          entreprise={facture.entreprise}
        />
      )}

      <Modal
        open={showPay}
        onClose={() => setShowPay(false)}
        title="Enregistrer une tranche de paiement"
        description={`Reste à payer : ${formatFcfaLabel(totaux.resteAPayer)} · prochaine tranche #${paiements.length + 1}`}
        footer={
          <FormActions
            formId="pay-form"
            onCancel={() => setShowPay(false)}
            submitLabel={paying ? "Enregistrement…" : "Valider et ouvrir le reçu"}
            loading={paying}
          />
        }
      >
        <form id="pay-form" onSubmit={handlePay} className="space-y-4">
          <Input
            label="Montant de la tranche (FCFA)"
            type="number"
            min={1}
            max={totaux.resteAPayer}
            value={payMontant}
            onChange={(e) => setPayMontant(e.target.value)}
            required
          />
          <Input
            label="Date de paiement"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            required
          />
          <Select
            label="Mode de paiement"
            value={payMode}
            onChange={(e) => setPayMode(e.target.value)}
          >
            <option value="">Choisir (optionnel)</option>
            {MODES_PAIEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-500">
            Après validation, le reçu de paiement s&apos;ouvre. Une écriture
            d&apos;entrée est créée au journal (n° BN-…).
          </p>
        </form>
      </Modal>
    </div>
  );
}
