"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PenLine } from "lucide-react";
import {
  rejectWithSignature,
  signApproval,
  type SignatureRow,
} from "@/app/actions/signatures";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { usePermissions } from "@/components/PermissionsProvider";
import {
  Alert,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  PageHeader,
} from "@/components/ui";
import { formatFcfa } from "@/lib/format";
import { canApproveCeo } from "@/lib/roles";
import type { SignatureSourceType } from "@/lib/signatures";

type Tab = "pending" | "history";

export function SignaturesClient({
  pending,
  history,
  savedSignature,
}: {
  pending: SignatureRow[];
  history: SignatureRow[];
  savedSignature: string | null;
}) {
  const router = useRouter();
  const { user } = usePermissions();
  const [tab, setTab] = useState<Tab>("pending");
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [signRow, setSignRow] = useState<SignatureRow | null>(null);
  const [useSaved, setUseSaved] = useState(Boolean(savedSignature));
  const padRef = useRef<SignaturePadHandle>(null);

  const canAct = user ? canApproveCeo(user.role) : false;
  const rows = tab === "pending" ? pending : history;

  async function openSignModal(row: SignatureRow) {
    setError(null);
    setSignRow(row);
    setUseSaved(Boolean(savedSignature));
  }

  async function handleSign() {
    if (!signRow) return;
    setError(null);

    let image: string | null = null;
    if (useSaved && savedSignature) {
      image = savedSignature;
    } else {
      image = padRef.current?.toDataUrl() ?? null;
    }

    if (!image) {
      setError("Veuillez signer avant de valider.");
      return;
    }

    setLoadingId(signRow.id);
    const r = await signApproval(
      signRow.sourceId,
      signRow.sourceType as SignatureSourceType,
      image
    );
    setLoadingId(null);

    if (!r.ok) {
      setError(r.error);
      return;
    }

    setSignRow(null);
    router.refresh();
  }

  async function handleReject(row: SignatureRow) {
    setError(null);
    const m = motif[row.id]?.trim();
    if (!m) {
      setError("Indiquez un motif de refus.");
      return;
    }
    setLoadingId(row.id);
    const r = await rejectWithSignature(
      row.sourceId,
      row.sourceType as SignatureSourceType,
      m
    );
    setLoadingId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Signature"
        description="Approbations électroniques avec signature manuscrite · produit MEGA Signature"
      />

      {error && <Alert type="error">{error}</Alert>}

      {!canAct && tab === "pending" && (
        <Alert type="info">
          Consultation seule. Seuls la CEO et l&apos;administrateur peuvent signer
          les demandes en attente.
        </Alert>
      )}

      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === "pending" ? "primary" : "secondary"}
          onClick={() => setTab("pending")}
        >
          À signer ({pending.length})
        </Button>
        <Button
          variant={tab === "history" ? "primary" : "secondary"}
          onClick={() => setTab("history")}
        >
          Historique
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable>
          <thead>
            <tr>
              <th>Source</th>
              <th>Date demande</th>
              <th>Libellé</th>
              <th className="text-right">Montant</th>
              <th>Demandé par</th>
              <th>Statut</th>
              {canAct && tab === "pending" && (
                <th className="text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={canAct && tab === "pending" ? 7 : 6}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {tab === "pending"
                    ? "Aucune signature en attente."
                    : "Aucune signature dans l'historique."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.statut === "EN_ATTENTE" ? "bg-amber-50/40" : undefined
                }
              >
                <td className="text-xs font-medium uppercase text-slate-600">
                  {row.sourceLabel}
                </td>
                <td className="whitespace-nowrap text-sm">
                  {row.demandeAt
                    ? new Date(row.demandeAt).toLocaleDateString("fr-FR")
                    : ""}
                </td>
                <td className="max-w-[220px] truncate font-medium">{row.titre}</td>
                <td className="text-right font-semibold">
                  {formatFcfa(row.montant)}
                </td>
                <td className="text-sm">{row.demandeParNom ?? ""}</td>
                <td className="text-sm">
                  <span
                    className={
                      row.statut === "SIGNE"
                        ? "text-[var(--c-sage-700)]"
                        : row.statut === "REFUSE"
                          ? "text-[var(--c-clay-700)]"
                          : "text-[var(--c-amber-700)]"
                    }
                  >
                    {row.statutLabel}
                  </span>
                  {row.signataireNom && row.statut !== "EN_ATTENTE" && (
                    <p className="text-xs text-slate-500">
                      {row.signataireNom}
                      {row.signeAt &&
                        ` · ${new Date(row.signeAt).toLocaleDateString("fr-FR")}`}
                    </p>
                  )}
                  {row.motifRefus && (
                    <p className="text-xs text-[var(--c-clay-700)]">
                      {row.motifRefus}
                    </p>
                  )}
                </td>
                {canAct && tab === "pending" && (
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        className="gap-1.5 px-3 py-1.5 text-xs"
                        disabled={loadingId === row.id}
                        onClick={() => openSignModal(row)}
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        Signer
                      </Button>
                      <Input
                        className="min-w-[160px] text-xs"
                        placeholder="Motif si refus…"
                        value={motif[row.id] ?? ""}
                        onChange={(e) =>
                          setMotif((m) => ({ ...m, [row.id]: e.target.value }))
                        }
                      />
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-xs"
                        disabled={loadingId === row.id}
                        onClick={() => handleReject(row)}
                      >
                        Refuser
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>

      <Modal
        open={Boolean(signRow)}
        onClose={() => setSignRow(null)}
        title="Signature électronique"
        description={
          signRow
            ? `${signRow.sourceLabel} · ${signRow.titre} · ${formatFcfa(signRow.montant)}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSignRow(null)}>
              Annuler
            </Button>
            <Button
              disabled={loadingId === signRow?.id}
              onClick={handleSign}
            >
              {loadingId === signRow?.id ? "Validation…" : "Signer et approuver"}
            </Button>
          </div>
        }
      >
        {savedSignature && (
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSaved}
              onChange={(e) => setUseSaved(e.target.checked)}
              className="rounded"
            />
            Utiliser ma signature enregistrée (Profil)
          </label>
        )}

        {useSaved && savedSignature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={savedSignature}
            alt="Signature enregistrée"
            className="mx-auto max-h-32 rounded border bg-white p-4"
          />
        ) : (
          <SignaturePad
            ref={padRef}
            initialImage={savedSignature}
            height={180}
          />
        )}
      </Modal>
    </div>
  );
}
