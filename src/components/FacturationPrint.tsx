"use client";

import { formatFcfa } from "@/lib/format";
import {
  MEGA_BRAND,
  MEGA_ROW_ALT,
  MEGA_ROW_BORDER,
  type LigneDoc,
} from "@/lib/facturation";
import { MegaLogo } from "@/components/MegaLogo";
import type { CSSProperties } from "react";

type Entreprise = {
  entreprise: string;
  emailContact?: string;
  telephoneContact?: string;
  email?: string;
  telephone?: string;
} | null;

const cellBorder = `1px solid ${MEGA_ROW_BORDER}`;
const cellBorderWhite = "1px solid rgba(255,255,255,0.45)";

const styleHeader: CSSProperties = {
  backgroundColor: MEGA_BRAND,
  color: "#ffffff",
};

const styleAccent: CSSProperties = {
  backgroundColor: MEGA_BRAND,
  color: "#ffffff",
};

const styleAlt: CSSProperties = {
  backgroundColor: MEGA_ROW_ALT,
  color: "#111111",
};

const styleWhite: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111111",
};

function rowStyle(index: number, accent: boolean): CSSProperties {
  if (accent) return styleAccent;
  return index % 2 === 1 ? styleAlt : styleWhite;
}

function LigneDetails({
  items,
  onAccent,
}: {
  items: string[];
  onAccent?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 list-none space-y-0.5 pl-0 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span style={{ color: onAccent ? "#ffffff" : undefined }}>-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ConditionsBlock() {
  return (
    <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-800">
      <div>
        <p className="font-semibold">Conditions de paiement :</p>
        <p>40 % à la commande, le reste à la livraison finale.</p>
      </div>

      <div>
        <p className="font-semibold">Hébergement :</p>
        <p>• Pré-requis :</p>
        <ul className="ml-4 list-none space-y-0.5">
          <li>- Serveur cloud / VPS/ PaaS</li>
          <li>- Runtime Node.js v18 minimum</li>
        </ul>
        <p className="mt-1">
          • Les accès aux comptes développeurs Play Store et Apple Store doivent
          nous être fournis
        </p>
      </div>

      <div>
        <p className="font-semibold">Garantie :</p>
        <p>
          Une période de 15 jours est incluse pour la correction d’éventuels
          bugs mineurs après la livraison.
        </p>
      </div>

      <div>
        <p className="font-semibold">Réalisation :</p>
        <p>
          Après validation du cahier de charge et démarrage de la production,
          tout changement fera l’objet d’une facture de maintenance
          complémentaire.
        </p>
      </div>
    </div>
  );
}

function SignaturesBlock() {
  return (
    <div className="mt-10">
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
  );
}

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

      <table
        className={`w-full border-collapse text-sm ${hasReliquat ? "mb-8" : "mb-4"}`}
      >
        <thead>
          <tr>
            <th
              className="px-3 py-2 text-left font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Désignation
            </th>
            <th
              className="w-20 px-3 py-2 text-center font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Duree
            </th>
            <th
              className="w-32 px-3 py-2 text-right font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Prix (FCFA)
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            const bg = rowStyle(i, l.styleAccent);
            const border = l.styleAccent ? cellBorderWhite : cellBorder;
            return (
              <tr key={l.ordre}>
                <td
                  className="px-3 py-3 align-top"
                  style={{ ...bg, border }}
                >
                  <strong>{l.designation}</strong>
                  <LigneDetails items={l.details} onAccent={l.styleAccent} />
                </td>
                <td
                  className="px-3 py-3 text-center align-top"
                  style={{ ...bg, border }}
                >
                  {l.duree ?? ""}
                </td>
                <td
                  className="px-3 py-3 text-right align-top font-medium"
                  style={{ ...bg, border }}
                >
                  {formatFcfa(l.prix)}
                </td>
              </tr>
            );
          })}
          <tr>
            <td
              className="px-3 py-2 font-semibold"
              colSpan={2}
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Total HT
            </td>
            <td
              className="px-3 py-2 text-right font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
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
              <tr>
                <th
                  className="px-3 py-2 text-left font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Désignation
                </th>
                <th
                  className="w-36 px-3 py-2 text-right font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Prix (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  className="px-3 py-2"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  {labelReliquat}
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  {formatFcfa(rel)}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 className="mb-3 text-base font-bold">
            {sectionTotal} - Total General
          </h2>
          <table className="mb-4 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-left font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Désignation
                </th>
                <th
                  className="w-36 px-3 py-2 text-right font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Prix (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  className="px-3 py-2"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  {labelReliquat}
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  {formatFcfa(rel)}
                </td>
              </tr>
              <tr>
                <td
                  className="px-3 py-2"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Nouvelles fonctionnalités
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  {formatFcfa(totalHT)}
                </td>
              </tr>
              <tr>
                <td
                  className="px-3 py-2 text-lg font-bold"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  Total
                </td>
                <td
                  className="px-3 py-2 text-right text-lg font-bold"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  {formatFcfa(totalGeneral)}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <ConditionsBlock />
      <SignaturesBlock />
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
            const bg = rowStyle(i, l.styleAccent);
            const border = l.styleAccent ? cellBorderWhite : cellBorder;
            return (
              <tr key={l.ordre}>
                <td
                  className="px-3 py-3 align-top"
                  style={{ ...bg, border }}
                  colSpan={2}
                >
                  <strong>{l.designation}</strong>
                  <LigneDetails items={l.details} onAccent={l.styleAccent} />
                </td>
                <td
                  className="w-36 px-3 py-3 text-right align-top font-medium"
                  style={{ ...bg, border }}
                >
                  {formatFcfa(l.prix)}
                </td>
              </tr>
            );
          })}
          <tr>
            <td
              className="px-3 py-2 font-semibold"
              colSpan={2}
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              {tauxTVA > 0 ? "Sous - Total HT" : "Total"}
            </td>
            <td
              className="px-3 py-2 text-right font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              {formatFcfa(totaux.totalHT)}
            </td>
          </tr>
          {tauxTVA > 0 && (
            <>
              <tr>
                <td
                  className="px-3 py-2"
                  colSpan={2}
                  style={{ ...styleWhite, border: cellBorder }}
                >
                  TVA {Math.round(tauxTVA * 100)}%
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ ...styleWhite, border: cellBorder }}
                >
                  {formatFcfa(totaux.tva)}
                </td>
              </tr>
              <tr>
                <td
                  className="px-3 py-2 font-semibold"
                  colSpan={2}
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Sous - Total TTC
                </td>
                <td
                  className="px-3 py-2 text-right font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  {formatFcfa(totaux.totalTTC)}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {hasReliquat && (
        <>
          <h2 className="mb-3 text-base font-bold">
            2 - Rappel Facture initiale
          </h2>
          <table className="mb-8 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-left font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Désignation
                </th>
                <th
                  className="w-36 px-3 py-2 text-right font-semibold"
                  style={{ ...styleHeader, border: cellBorderWhite }}
                >
                  Prix (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  className="px-3 py-2"
                  style={{ ...styleAlt, border: cellBorder }}
                >
                  {labelReliquat}
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ ...styleAlt, border: cellBorder }}
                >
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
      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              className="px-3 py-2 text-left font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Désignation
            </th>
            <th
              className="w-36 px-3 py-2 text-right font-semibold"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Prix (FCFA)
            </th>
          </tr>
        </thead>
        <tbody>
          {hasReliquat && (
            <tr>
              <td
                className="px-3 py-2"
                style={{ ...styleAlt, border: cellBorder }}
              >
                {labelReliquat}
              </td>
              <td
                className="px-3 py-2 text-right"
                style={{ ...styleAlt, border: cellBorder }}
              >
                {formatFcfa(reliquat)}
              </td>
            </tr>
          )}
          <tr>
            <td
              className="px-3 py-2"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              Nouvelles fonctionnalités
            </td>
            <td
              className="px-3 py-2 text-right"
              style={{ ...styleHeader, border: cellBorderWhite }}
            >
              {formatFcfa(totaux.totalTTC)}
            </td>
          </tr>
          <tr>
            <td
              className="px-3 py-2 text-lg font-bold"
              style={{ ...styleAlt, border: cellBorder }}
            >
              Total
            </td>
            <td
              className="px-3 py-2 text-right text-lg font-bold"
              style={{ ...styleAlt, border: cellBorder }}
            >
              {formatFcfa(totaux.totalGeneral)}
            </td>
          </tr>
        </tbody>
      </table>

      <ConditionsBlock />
      <SignaturesBlock />
    </div>
  );
}
