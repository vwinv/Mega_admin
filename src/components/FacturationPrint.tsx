"use client";

import { formatFcfa } from "@/lib/format";
import { MEGA_BRAND, type LigneDoc } from "@/lib/facturation";
import { MegaLogo } from "@/components/MegaLogo";

type Entreprise = {
  entreprise: string;
  emailContact?: string;
  telephoneContact?: string;
  email?: string;
  telephone?: string;
} | null;

function LigneDetails({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 list-none space-y-0.5 pl-0 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-[10px]">○</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const ROW_ALT = "#faf6f0";

export function DevisPrintView({
  numero,
  titre,
  date,
  clientNom,
  lignes,
  reliquat,
  reliquatLabel,
  entreprise,
}: {
  numero: string;
  titre: string;
  date: string;
  clientNom: string;
  lignes: LigneDoc[];
  reliquat?: number;
  reliquatLabel?: string;
  entreprise: Entreprise;
}) {
  const email =
    entreprise?.emailContact ?? entreprise?.email ?? "contact@mega-sn.com";
  const tel =
    entreprise?.telephoneContact ?? entreprise?.telephone ?? "78 450 40 52";
  const rel = reliquat ?? 0;
  const hasReliquat = rel > 0;
  const labelReliquat = (reliquatLabel ?? "Reliquat").trim() || "Reliquat";
  const totalHT = lignes.reduce((s, l) => s + l.prix, 0);
  const totalGeneral = totalHT + rel;
  const sectionTotal = hasReliquat ? 3 : 2;

  return (
    <div className="facture-doc mx-auto max-w-[800px] bg-white p-8 text-black print:p-0">
      <div className="mb-8 flex gap-6">
        <MegaLogo width={260} priority />
        <div className="text-sm leading-relaxed">
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

      <h1 className="mb-2 text-lg font-bold">
        DEVIS N°{numero} – {titre}
      </h1>
      <p className="mb-1 text-sm">
        <strong>Date :</strong> {new Date(date).toLocaleDateString("fr-FR")}
      </p>
      <p className="mb-6 text-sm">
        <strong>Client :</strong> {clientNom}
      </p>

      <h2 className="mb-3 text-base font-bold">1 - Nouvelles fonctionnalités</h2>

      <table className="mb-8 w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <th className="border border-white/30 px-3 py-2 text-left font-semibold">
              Désignation
            </th>
            <th className="w-20 border border-white/30 px-3 py-2 text-center font-semibold">
              Duree
            </th>
            <th className="w-32 border border-white/30 px-3 py-2 text-right font-semibold">
              Prix (FCFA)
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr
              key={l.ordre}
              style={
                l.styleAccent
                  ? { backgroundColor: MEGA_BRAND, color: "white" }
                  : i % 2 === 1
                    ? { backgroundColor: ROW_ALT }
                    : undefined
              }
            >
              <td className="border border-slate-200 px-3 py-3 align-top">
                <strong>{l.designation}</strong>
                <LigneDetails items={l.details} />
              </td>
              <td className="border border-slate-200 px-3 py-3 text-center align-top">
                {l.duree ?? ""}
              </td>
              <td className="border border-slate-200 px-3 py-3 text-right align-top font-medium">
                {formatFcfa(l.prix)}
              </td>
            </tr>
          ))}
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td
              className="border border-white/30 px-3 py-2 font-semibold"
              colSpan={2}
            >
              Total HT
            </td>
            <td className="border border-white/30 px-3 py-2 text-right font-semibold">
              {formatFcfa(totalHT)}
            </td>
          </tr>
        </tbody>
      </table>

      {hasReliquat && (
        <>
          <h2 className="mb-3 text-base font-bold">
            2 - Rappel Facture initiale
          </h2>
          <table className="mb-8 w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
                <th className="border border-white/30 px-3 py-2 text-left">
                  Désignation
                </th>
                <th className="w-36 border border-white/30 px-3 py-2 text-right">
                  Prix (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2">
                  {labelReliquat}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right">
                  {formatFcfa(rel)}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 className="mb-3 text-base font-bold">
            {sectionTotal} - Total General
          </h2>
          <table className="mb-10 w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
                <th className="border border-white/30 px-3 py-2 text-left">
                  Désignation
                </th>
                <th className="w-36 border border-white/30 px-3 py-2 text-right">
                  Prix (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2">
                  {labelReliquat}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right">
                  {formatFcfa(rel)}
                </td>
              </tr>
              <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
                <td className="border border-white/30 px-3 py-2">
                  Nouvelles fonctionnalités
                </td>
                <td className="border border-white/30 px-3 py-2 text-right">
                  {formatFcfa(totalHT)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 text-lg font-bold">
                  Total
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right text-lg font-bold">
                  {formatFcfa(totalGeneral)}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function FacturePrintView({
  numero,
  titre,
  date,
  clientNom,
  lignes,
  reliquat,
  reliquatLabel,
  tauxTVA,
  totaux,
  entreprise,
}: {
  numero: string;
  titre?: string | null;
  date: string;
  clientNom: string;
  lignes: LigneDoc[];
  reliquat: number;
  reliquatLabel: string;
  tauxTVA: number;
  totaux: {
    totalHT: number;
    tva: number;
    totalTTC: number;
    totalGeneral: number;
  };
  entreprise: Entreprise;
}) {
  const email =
    entreprise?.emailContact ?? entreprise?.email ?? "contact@mega-sn.com";
  const tel =
    entreprise?.telephoneContact ?? entreprise?.telephone ?? "78 450 40 52";
  const hasReliquat = reliquat > 0;
  const labelReliquat = reliquatLabel.trim() || "Reliquat";
  const sectionTotal = hasReliquat ? 3 : 2;

  return (
    <div className="facture-doc mx-auto max-w-[800px] bg-white p-8 text-black print:p-0">
      <div className="mb-8 flex gap-6">
        <MegaLogo width={260} priority />
        <div className="text-sm leading-relaxed">
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

      <h1 className="mb-2 text-lg font-bold">
        FACTURE N°{numero}
        {titre ? ` – ${titre}` : ""}
      </h1>
      <p className="mb-1 text-sm">
        <strong>Date :</strong> {new Date(date).toLocaleDateString("fr-FR")}
      </p>
      <p className="mb-6 text-sm">
        <strong>Client :</strong> {clientNom}
      </p>

      <h2 className="mb-3 text-base font-bold">1 - Nouvelles fonctionnalités</h2>

      <table className="mb-8 w-full border-collapse text-sm">
        <tbody>
          {lignes.map((l, i) => {
            const accent = l.styleAccent;
            const bg = accent
              ? { backgroundColor: MEGA_BRAND, color: "white" as const }
              : i % 2 === 1
                ? { backgroundColor: ROW_ALT }
                : undefined;
            return (
              <tr key={l.ordre}>
                <td
                  className="border border-slate-200 px-3 py-3 align-top"
                  style={bg}
                  colSpan={2}
                >
                  <strong>{l.designation}</strong>
                  <LigneDetails items={l.details} />
                </td>
                <td
                  className="w-36 border border-slate-200 px-3 py-3 text-right align-top font-medium"
                  style={bg}
                >
                  {formatFcfa(l.prix)}
                </td>
              </tr>
            );
          })}
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td
              className="border border-white/30 px-3 py-2 font-semibold"
              colSpan={2}
            >
              Sous - Total HT
            </td>
            <td className="border border-white/30 px-3 py-2 text-right font-semibold">
              {formatFcfa(totaux.totalHT)}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-200 px-3 py-2" colSpan={2}>
              TVA {Math.round(tauxTVA * 100)}%
            </td>
            <td className="border border-slate-200 px-3 py-2 text-right">
              {formatFcfa(totaux.tva)}
            </td>
          </tr>
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td
              className="border border-white/30 px-3 py-2 font-semibold"
              colSpan={2}
            >
              Sous - Total TTC
            </td>
            <td className="border border-white/30 px-3 py-2 text-right font-semibold">
              {formatFcfa(totaux.totalTTC)}
            </td>
          </tr>
        </tbody>
      </table>

      {hasReliquat && (
        <>
          <h2 className="mb-3 text-base font-bold">
            2 - Rappel Facture initiale
          </h2>
          <table className="mb-8 w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
                <th className="border border-white/30 px-3 py-2 text-left">
                  Désignation
                </th>
                <th className="w-36 border border-white/30 px-3 py-2 text-right">
                  Prix (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2">
                  {labelReliquat}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-right">
                  {formatFcfa(reliquat)}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <h2 className="mb-3 text-base font-bold">
        {sectionTotal} - Total General
      </h2>
      <table className="mb-10 w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <th className="border border-white/30 px-3 py-2 text-left">
              Désignation
            </th>
            <th className="w-36 border border-white/30 px-3 py-2 text-right">
              Prix (FCFA)
            </th>
          </tr>
        </thead>
        <tbody>
          {hasReliquat && (
            <tr>
              <td className="border border-slate-200 px-3 py-2">
                {labelReliquat}
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right">
                {formatFcfa(reliquat)}
              </td>
            </tr>
          )}
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td className="border border-white/30 px-3 py-2">
              Nouvelles fonctionnalités
            </td>
            <td className="border border-white/30 px-3 py-2 text-right">
              {formatFcfa(totaux.totalTTC)}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-200 px-3 py-2 text-lg font-bold">
              Total
            </td>
            <td className="border border-slate-200 px-3 py-2 text-right text-lg font-bold">
              {formatFcfa(totaux.totalGeneral)}
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
            <div className="mb-2 flex h-16 items-end justify-center border-b border-slate-400">
              <span
                className="select-none pb-1 font-serif text-2xl italic"
                style={{ color: MEGA_BRAND }}
              >
                MEGA
              </span>
            </div>
            <p className="text-center text-sm font-medium">MEGA</p>
          </div>
          <div>
            <div className="mb-2 h-16 border-b border-slate-400" />
            <p className="text-center text-sm font-medium">Le Client</p>
          </div>
        </div>
      </div>
    </div>
  );
}
