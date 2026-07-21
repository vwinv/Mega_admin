"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { formatFcfa, formatFcfaLabel } from "@/lib/format";
import { MEGA_BRAND, STATUT_FACTURE_LABELS } from "@/lib/facturation";

function DocLogo({ height = 120 }: { height?: number }) {
  const width = Math.round((height * 88) / 393);
  return (
    <img
      src="/mega-logo-vertical.png"
      alt="MEGA"
      width={width}
      height={height}
      className="block h-auto shrink-0 object-contain object-left"
      style={{ height, width, aspectRatio: "88 / 393" }}
    />
  );
}

type RecuData = {
  operationId: string;
  tranche: number;
  totalTranches: number;
  date: string;
  montant: number;
  numeroPiece: string | null;
  modePaiement: string | null;
  libelle: string;
  validePar: string | null;
  facture: {
    id: string;
    numero: string;
    titre: string | null;
    date: string;
    statut: string;
    clientNom: string;
    clientAdresse: string | null;
    clientTelephone: string | null;
    clientEmail: string | null;
  };
  totaux: {
    totalGeneral: number;
    montantPaye: number;
    resteAPayer: number;
  };
  entreprise: {
    entreprise: string;
    emailContact?: string | null;
    telephoneContact?: string | null;
  } | null;
};

export function RecuPaiementClient({ recu }: { recu: RecuData }) {
  const email =
    recu.entreprise?.emailContact ?? "contact@mega-sn.com";
  const tel = recu.entreprise?.telephoneContact ?? "78 450 40 52";

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/facturation/factures/${recu.facture.id}`}
          className="text-sm text-slate-600 hover:text-mega-700"
        >
          ← Retour à la facture
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimer le reçu
        </Button>
      </div>

      <div className="facture-doc mx-auto max-w-[720px] bg-white p-8 text-black print:p-0">
        <div className="mb-8">
          <DocLogo height={130} />
          <div className="mt-4 text-sm leading-relaxed">
            <p>
              <strong>Établi par :</strong> MEGA
            </p>
            <p>
              <strong>Courriel :</strong> {email}
            </p>
            <p>
              <strong>Téléphone :</strong> {tel}
            </p>
          </div>
        </div>

        <h1 className="mb-1 text-xl font-bold" style={{ color: MEGA_BRAND }}>
          REÇU DE PAIEMENT
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Tranche {recu.tranche}
          {recu.totalTranches > 1 ? ` / ${recu.totalTranches}` : ""} · Facture
          N°{recu.facture.numero}
        </p>

        <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p>
              <strong>Date du paiement :</strong>{" "}
              {new Date(recu.date).toLocaleDateString("fr-FR")}
            </p>
            <p>
              <strong>N° de pièce :</strong>{" "}
              <span className="font-mono">{recu.numeroPiece ?? "—"}</span>
            </p>
            <p>
              <strong>Mode :</strong> {recu.modePaiement ?? "—"}
            </p>
            {recu.validePar && (
              <p>
                <strong>Enregistré par :</strong> {recu.validePar}
              </p>
            )}
          </div>
          <div>
            <p>
              <strong>Client :</strong> {recu.facture.clientNom}
            </p>
            {recu.facture.clientTelephone && (
              <p>
                <strong>Téléphone :</strong> {recu.facture.clientTelephone}
              </p>
            )}
            {recu.facture.clientEmail && (
              <p>
                <strong>Email :</strong> {recu.facture.clientEmail}
              </p>
            )}
            {recu.facture.clientAdresse && (
              <p>
                <strong>Adresse :</strong> {recu.facture.clientAdresse}
              </p>
            )}
          </div>
        </div>

        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
              <th className="border border-white/30 px-3 py-2 text-left">
                Désignation
              </th>
              <th className="w-40 border border-white/30 px-3 py-2 text-right">
                Montant (FCFA)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-200 px-3 py-3">
                Paiement tranche {recu.tranche} — Facture N°{recu.facture.numero}
                {recu.facture.titre ? ` · ${recu.facture.titre}` : ""}
              </td>
              <td className="border border-slate-200 px-3 py-3 text-right font-semibold">
                {formatFcfa(recu.montant)}
              </td>
            </tr>
            <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
              <td className="border border-white/30 px-3 py-2 font-semibold">
                Montant reçu
              </td>
              <td className="border border-white/30 px-3 py-2 text-right font-semibold">
                {formatFcfa(recu.montant)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="mb-10 w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
              <th className="border border-white/30 px-3 py-2 text-left">
                Situation de la facture
              </th>
              <th className="w-40 border border-white/30 px-3 py-2 text-right">
                Montant (FCFA)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-200 px-3 py-2">
                Total général facture
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right">
                {formatFcfa(recu.totaux.totalGeneral)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-200 px-3 py-2">
                Cumulative payé
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right">
                {formatFcfa(recu.totaux.montantPaye)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-200 px-3 py-2 font-semibold">
                Reste à payer
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">
                {formatFcfa(recu.totaux.resteAPayer)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-200 px-3 py-2" colSpan={2}>
                Statut facture :{" "}
                <strong>
                  {STATUT_FACTURE_LABELS[recu.facture.statut] ??
                    recu.facture.statut}
                </strong>
                {recu.totaux.resteAPayer === 0
                  ? " — Facture soldée"
                  : ` — Paiement partiel (${formatFcfaLabel(recu.totaux.resteAPayer)} restants)`}
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <p className="mb-6 font-semibold">
            Signatures des différentes parties :
          </p>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="mb-2 flex h-24 items-end justify-center border-b border-slate-400 px-2">
                <img
                  src="/signature.png"
                  alt="Signature MEGA"
                  width={220}
                  height={90}
                  className="max-h-[88px] w-auto object-contain object-bottom mix-blend-multiply"
                />
              </div>
              <p className="text-center text-sm font-medium">MEGA</p>
            </div>
            <div>
              <div className="mb-2 h-24 border-b border-slate-400" />
              <p className="text-center text-sm font-medium">Le Client</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
