"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PenLine } from "lucide-react";
import {
  approveOperation,
  rejectOperation,
  type ApprobationRow,
} from "@/app/actions/approbations";
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

export function ApprobationsClient({
  rows,
  savedSignature,
}: {
  rows: ApprobationRow[];
  savedSignature: string | null;
}) {
  const router = useRouter();
  const { user } = usePermissions();
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [signRow, setSignRow] = useState<ApprobationRow | null>(null);
  const [useSaved, setUseSaved] = useState(Boolean(savedSignature));
  const padRef = useRef<SignaturePadHandle>(null);

  const canAct = user ? canApproveCeo(user.role) : false;

  async function handleSignApprove() {
    if (!signRow) return;
    setError(null);

    let image: string | null = null;
    if (useSaved && savedSignature) {
      image = savedSignature;
    } else {
      image = padRef.current?.toDataUrl() ?? null;
    }

    if (!image) {
      setError("Veuillez signer avant d'approuver.");
      return;
    }

    setLoadingId(signRow.id);
    const r = await approveOperation(signRow.id, signRow.source, image);
    setLoadingId(null);

    if (!r.ok) {
      setError(r.error);
      return;
    }

    setSignRow(null);
    router.refresh();
  }

  async function handleReject(row: ApprobationRow) {
    setError(null);
    const m = motif[row.id]?.trim();
    if (!m) {
      setError("Indiquez un motif de refus.");
      return;
    }
    setLoadingId(row.id);
    const r = await rejectOperation(row.id, row.source, m);
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
        title="Approbations CEO"
        description="Opérations et factures en attente de validation par signature électronique"
      />

      {error && <Alert type="error">{error}</Alert>}

      {!canAct && (
        <Alert type="info">
          Consultation seule. Seuls le profil CEO et l&apos;administrateur peuvent
          approuver ou refuser.
        </Alert>
      )}

      <Card className="overflow-hidden p-0">
        <DataTable>
          <thead>
            <tr>
              <th>Source</th>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th className="text-right">Montant</th>
              <th>Demandé par</th>
              {canAct && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={canAct ? 7 : 6} className="px-4 py-12 text-center text-slate-500">
                  Aucune demande en attente.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={`${row.source}-${row.id}`} className="bg-amber-50/40">
                <td className="text-xs font-medium uppercase text-slate-600">
                  {row.source === "journal"
                    ? "Journal"
                    : row.source === "caisse"
                      ? "Caisse"
                      : "Facture"}
                </td>
                <td className="whitespace-nowrap text-sm">
                  {row.date
                    ? new Date(row.date).toLocaleDateString("fr-FR")
                    : ""}
                </td>
                <td className="max-w-[200px] truncate font-medium">{row.libelle}</td>
                <td className="text-xs text-slate-600">{row.categorieNom}</td>
                <td className="text-right font-semibold">
                  {formatFcfa(row.montant)}
                  {row.montantType !== "facture" && (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      ({row.montantType === "entree" ? "entrée" : "sortie"})
                    </span>
                  )}
                </td>
                <td className="text-sm">{row.demandePar ?? ""}</td>
                {canAct && (
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        className="gap-1.5 px-3 py-1.5 text-xs"
                        disabled={loadingId === row.id}
                        onClick={() => {
                          setSignRow(row);
                          setUseSaved(Boolean(savedSignature));
                        }}
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
        title="Signature d'approbation"
        description={
          signRow
            ? `${signRow.libelle} · ${formatFcfa(signRow.montant)}`
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
              onClick={handleSignApprove}
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
