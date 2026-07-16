"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  convertirDevisEnFacture,
  deleteDevis,
  saveDevis,
  type ClientRow,
} from "@/app/actions/facturation";
import { DevisPrintView } from "@/components/FacturationPrint";
import { formatFcfaLabel } from "@/lib/format";
import { STATUTS_DEVIS, STATUT_DEVIS_LABELS, type LigneDoc } from "@/lib/facturation";
import {
  Alert,
  Button,
  Card,
  FormActions,
  Input,
  Select,
} from "@/components/ui";

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

function emptyLigne(ordre: number): LigneDoc {
  return {
    ordre,
    designation: "",
    details: [],
    duree: "",
    prix: 0,
    styleAccent: false,
  };
}

function LigneEditor({
  ligne,
  index,
  showDuree,
  onChange,
  onRemove,
  canRemove,
}: {
  ligne: LigneDoc;
  index: number;
  showDuree?: boolean;
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
        {showDuree ? (
          <Input
            label="Durée"
            value={ligne.duree ?? ""}
            onChange={(e) => onChange({ ...ligne, duree: e.target.value })}
          />
        ) : (
          <Input
            label="Prix (FCFA)"
            type="number"
            min={0}
            value={ligne.prix || ""}
            onChange={(e) =>
              onChange({ ...ligne, prix: parseInt(e.target.value, 10) || 0 })
            }
          />
        )}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
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
        {showDuree && (
          <Input
            label="Prix (FCFA)"
            type="number"
            min={0}
            value={ligne.prix || ""}
            onChange={(e) =>
              onChange({ ...ligne, prix: parseInt(e.target.value, 10) || 0 })
            }
          />
        )}
      </div>
    </div>
  );
}

export function DevisDetailClient({
  devis,
  clients,
  canEdit,
}: {
  devis: {
    id?: string;
    numero?: string;
    titre: string;
    date: string;
    statut: string;
    notes?: string | null;
    clientId: string;
    factureId?: string | null;
    lignes: LigneDoc[];
    totalHT: number;
    entreprise: {
      entreprise: string;
      emailContact?: string;
      telephoneContact?: string;
    } | null;
    clientNom?: string;
  };
  clients: ClientRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const isNew = !devis.id;
  const [editMode, setEditMode] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState(devis.titre);
  const [date, setDate] = useState(devis.date.slice(0, 10));
  const [clientId, setClientId] = useState(devis.clientId);
  const [statut, setStatut] = useState(devis.statut);
  const [notes, setNotes] = useState(devis.notes ?? "");
  const [lignes, setLignes] = useState<LigneDoc[]>(
    devis.lignes.length > 0 ? devis.lignes : [emptyLigne(0)]
  );
  const [reliquat, setReliquat] = useState("0");
  const [factureNumero, setFactureNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const clientNom =
    devis.clientNom ?? clients.find((c) => c.id === clientId)?.nom ?? "";
  const totalHT = lignes.reduce((s, l) => s + l.prix, 0);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveDevis({
      id: devis.id,
      titre,
      date,
      clientId,
      statut,
      notes,
      lignes: lignes.map((l, i) => ({ ...l, ordre: i })),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (isNew) router.replace(`/facturation/devis/${result.id}`);
    else {
      setEditMode(false);
      router.refresh();
    }
  }

  async function handleConvert() {
    if (!devis.id) return;
    if (!factureNumero.trim()) {
      setError("Indiquez le numéro de facture.");
      return;
    }
    const rel = parseInt(reliquat, 10) || 0;
    const result = await convertirDevisEnFacture(devis.id, factureNumero, rel);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/facturation/factures/${result.factureId}`);
  }

  async function handleDelete() {
    if (!devis.id) return;
    if (!confirm(`Supprimer le devis ${devis.numero} ?`)) return;
    setError(null);
    setDeleting(true);
    const result = await deleteDevis(devis.id);
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
          {!isNew && (
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimer
            </Button>
          )}
          {canEdit && !isNew && !editMode && (
            <Button variant="secondary" onClick={() => setEditMode(true)}>
              Modifier
            </Button>
          )}
          {canEdit && !isNew && !editMode && !devis.factureId && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          )}
          {canEdit && devis.id && !devis.factureId && devis.statut !== "FACTURE" && (
            <div className="flex flex-wrap items-end gap-2">
              <Input
                label="N° facture"
                value={factureNumero}
                onChange={(e) => setFactureNumero(e.target.value)}
                className="!w-40"
                placeholder="ex. F2026-001"
                required
              />
              <Input
                type="number"
                min={0}
                label="Reliquat"
                value={reliquat}
                onChange={(e) => setReliquat(e.target.value)}
                className="!w-32"
              />
              <Button onClick={handleConvert}>Convertir en facture</Button>
            </div>
          )}
          {devis.factureId && (
            <Link href={`/facturation/factures/${devis.factureId}`}>
              <Button variant="secondary">Voir la facture</Button>
            </Link>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {editMode && canEdit ? (
        <Card>
          <form id="devis-form" onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Titre du devis"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
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
                  {STATUTS_DEVIS.map((s) => (
                    <option key={s} value={s}>
                      {STATUT_DEVIS_LABELS[s]}
                    </option>
                  ))}
                </Select>
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
                    showDuree
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
              <p className="mt-4 text-right text-sm font-semibold">
                Total HT : {formatFcfaLabel(totalHT)}
              </p>
            </div>

            <Textarea
              label="Notes internes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <FormActions
              formId="devis-form"
              onCancel={() => (isNew ? router.push("/facturation") : setEditMode(false))}
              submitLabel={saving ? "Enregistrement…" : "Enregistrer"}
              loading={saving}
            />
          </form>
        </Card>
      ) : (
        <DevisPrintView
          numero={devis.numero ?? ""}
          titre={titre}
          date={date}
          clientNom={clientNom}
          lignes={lignes}
          entreprise={devis.entreprise}
        />
      )}
    </div>
  );
}
