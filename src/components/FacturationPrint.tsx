"use client";

import { formatFcfa } from "@/lib/format";
import { MEGA_BRAND, type LigneDoc } from "@/lib/facturation";

const MEGA_CREAM = "#faf0ea";

type Entreprise = {
  entreprise: string;
  emailContact?: string;
  telephoneContact?: string;
  email?: string;
  telephone?: string;
} | null;

function MegaVerticalLogo() {
  return (
    <div
      className="select-none font-black leading-[0.82] tracking-tight"
      style={{
        color: MEGA_BRAND,
        fontSize: "2rem",
        fontFamily: '"Arial Black", Arial, Helvetica, sans-serif',
      }}
      aria-label="MEGA"
    >
      {["m", "e", "g", "a"].map((letter) => (
        <span key={letter} className="block">
          {letter}
        </span>
      ))}
    </div>
  );
}

function LigneDetails({ items, inverted }: { items: string[]; inverted?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 list-none space-y-1 pl-0">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[13px] leading-snug">
          <span className={inverted ? "text-white/90" : "text-slate-500"}>○</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DocContact({ entreprise }: { entreprise: Entreprise }) {
  const email =
    entreprise?.emailContact ?? entreprise?.email ?? "contact@mega-sn.com";
  const tel =
    entreprise?.telephoneContact ?? entreprise?.telephone ?? "78 450 40 52";

  return (
    <div className="mt-4 text-[13px] leading-relaxed text-black">
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
  );
}

function DocTitleBlock({
  kind,
  numero,
  titre,
  date,
  clientNom,
}: {
  kind: "DEVIS" | "FACTURE";
  numero: string;
  titre?: string | null;
  date: string;
  clientNom: string;
}) {
  const label = kind === "DEVIS" ? "DEVIS" : "FACTURE";
  const dateStr = new Date(date).toLocaleDateString("fr-FR");

  return (
    <div className="my-8 text-center">
      <h1 className="text-[17px] font-bold tracking-wide text-black">
        {label} N°{numero}
        {titre ? (
          <>
            {" "}
            – <em>{titre}</em>
          </>
        ) : null}
      </h1>
      <p className="mt-2 text-[13px] italic text-black">
        <strong className="not-italic">Date :</strong> {dateStr}
      </p>
      <p className="mt-6 text-left text-[13px] text-black">
        <strong>Client :</strong> {clientNom}
      </p>
    </div>
  );
}

function SignatureBlock() {
  return (
    <div className="mt-14 break-inside-avoid">
      <p className="mb-8 text-[13px] font-bold text-black">
        Signatures des différentes parties :
      </p>
      <div className="grid grid-cols-2 gap-16">
        <div>
          <div className="mb-2 h-14" />
          <div className="border-t border-slate-400 pt-2 text-center text-[13px] font-bold">
            MEGA
          </div>
        </div>
        <div>
          <div className="mb-2 h-14" />
          <div className="border-t border-slate-400 pt-2 text-center text-[13px] font-bold">
            Le Client
          </div>
        </div>
      </div>
    </div>
  );
}

function isBarLigne(l: LigneDoc): boolean {
  if (l.details.length > 0) return false;
  if (!l.duree?.trim()) return true;
  return !/\d/.test(l.duree);
}

function LigneTableDevis({ lignes }: { lignes: LigneDoc[] }) {
  const tableLignes = lignes.filter((l) => !isBarLigne(l));
  const barLignes = lignes.filter((l) => isBarLigne(l));

  return (
    <>
      {tableLignes.length > 0 && (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
              <th className="px-4 py-2.5 text-left font-bold">Désignation</th>
              <th className="w-24 px-3 py-2.5 text-center font-bold">Durée</th>
              <th className="w-28 px-3 py-2.5 text-center font-bold">Prix (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {tableLignes.map((l) => {
              const accent = l.styleAccent;
              return (
                <tr
                  key={l.ordre}
                  style={{
                    backgroundColor: accent ? MEGA_BRAND : MEGA_CREAM,
                    color: accent ? "white" : "black",
                  }}
                >
                  <td className="px-4 py-4 align-top">
                    <strong className="text-[14px]">{l.designation}</strong>
                    <LigneDetails items={l.details} inverted={accent} />
                  </td>
                  <td className="px-3 py-4 text-center align-middle">
                    {l.duree ?? ""}
                  </td>
                  <td className="px-3 py-4 text-center align-middle font-medium">
                    {formatFcfa(l.prix)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {barLignes.length > 0 && (
        <table className="mt-0 w-full border-collapse text-[13px]">
          <tbody>
            {barLignes.map((l) => {
              const accent = l.styleAccent;
              return (
                <tr
                  key={l.ordre}
                  style={{
                    backgroundColor: accent ? MEGA_BRAND : "white",
                    color: accent ? "white" : "black",
                  }}
                >
                  <td className="px-4 py-3 font-medium">{l.designation}</td>
                  <td className="w-40 px-4 py-3 text-right font-bold">
                    {formatFcfa(l.prix)}
                    {l.duree ? `/${l.duree}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function LigneTableFacture({ lignes }: { lignes: LigneDoc[] }) {
  const tableLignes = lignes.filter((l) => !isBarLigne(l));
  const barLignes = lignes.filter((l) => isBarLigne(l));

  return (
    <>
      {tableLignes.length > 0 && (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
              <th className="px-4 py-2.5 text-left font-bold">Désignation</th>
              <th className="w-36 px-4 py-2.5 text-right font-bold">Prix (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {tableLignes.map((l) => {
              const accent = l.styleAccent;
              return (
                <tr
                  key={l.ordre}
                  style={{
                    backgroundColor: accent ? MEGA_BRAND : MEGA_CREAM,
                    color: accent ? "white" : "black",
                  }}
                >
                  <td className="px-4 py-4 align-top">
                    <strong className="text-[14px]">{l.designation}</strong>
                    <LigneDetails items={l.details} inverted={accent} />
                  </td>
                  <td className="px-4 py-4 text-right align-middle font-medium">
                    {formatFcfa(l.prix)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {barLignes.length > 0 && (
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {barLignes.map((l) => {
              const accent = l.styleAccent;
              return (
                <tr
                  key={l.ordre}
                  style={{
                    backgroundColor: accent ? MEGA_BRAND : "white",
                    color: accent ? "white" : "black",
                  }}
                >
                  <td className="px-4 py-3 font-medium">{l.designation}</td>
                  <td className="w-40 px-4 py-3 text-right font-bold">
                    {formatFcfa(l.prix)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function DocShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="facture-doc mx-auto max-w-[210mm] bg-white px-10 py-10 text-black print:max-w-none print:px-8 print:py-6"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {children}
    </div>
  );
}

export function DevisPrintView({
  numero,
  titre,
  date,
  clientNom,
  lignes,
  entreprise,
  sectionTitre = "1 - Mise en place initiale",
}: {
  numero: string;
  titre: string;
  date: string;
  clientNom: string;
  lignes: LigneDoc[];
  entreprise: Entreprise;
  sectionTitre?: string;
}) {
  return (
    <DocShell>
      <MegaVerticalLogo />
      <DocContact entreprise={entreprise} />
      <DocTitleBlock
        kind="DEVIS"
        numero={numero}
        titre={titre}
        date={date}
        clientNom={clientNom}
      />

      <h2 className="mb-3 text-[14px] font-bold text-black">{sectionTitre}</h2>
      <LigneTableDevis lignes={lignes} />
      <SignatureBlock />
    </DocShell>
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
  return (
    <DocShell>
      <MegaVerticalLogo />
      <DocContact entreprise={entreprise} />
      <DocTitleBlock
        kind="FACTURE"
        numero={numero}
        titre={titre}
        date={date}
        clientNom={clientNom}
      />

      <h2 className="mb-3 text-[14px] font-bold text-black">
        1 - Nouvelles fonctionnalités
      </h2>
      <LigneTableFacture lignes={lignes} />

      <table className="mt-0 w-full border-collapse text-[13px]">
        <tbody>
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td className="px-4 py-2.5 font-bold">Sous - Total HT</td>
            <td className="w-36 px-4 py-2.5 text-right font-bold">
              {formatFcfa(totaux.totalHT)}
            </td>
          </tr>
          <tr style={{ backgroundColor: MEGA_CREAM }}>
            <td className="px-4 py-2.5">TVA {Math.round(tauxTVA * 100)}%</td>
            <td className="px-4 py-2.5 text-right">{formatFcfa(totaux.tva)}</td>
          </tr>
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td className="px-4 py-2.5 font-bold">Sous - Total TTC</td>
            <td className="px-4 py-2.5 text-right font-bold">
              {formatFcfa(totaux.totalTTC)}
            </td>
          </tr>
        </tbody>
      </table>

      {reliquat > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[14px] font-bold text-black">
            2 - Rappel Facture initiale
          </h2>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
                <th className="px-4 py-2.5 text-left font-bold">Désignation</th>
                <th className="w-36 px-4 py-2.5 text-right font-bold">Prix (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: MEGA_CREAM }}>
                <td className="px-4 py-3">{reliquatLabel}</td>
                <td className="px-4 py-3 text-right">{formatFcfa(reliquat)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <h2 className="mb-3 mt-8 text-[14px] font-bold text-black">3 - Total Général</h2>
      <table className="mb-4 w-full border-collapse text-[13px]">
        <thead>
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <th className="px-4 py-2.5 text-left font-bold">Désignation</th>
            <th className="w-36 px-4 py-2.5 text-right font-bold">Prix (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          {reliquat > 0 && (
            <tr style={{ backgroundColor: MEGA_CREAM }}>
              <td className="px-4 py-3">{reliquatLabel}</td>
              <td className="px-4 py-3 text-right">{formatFcfa(reliquat)}</td>
            </tr>
          )}
          <tr style={{ backgroundColor: MEGA_BRAND, color: "white" }}>
            <td className="px-4 py-3">Nouvelles fonctionnalités</td>
            <td className="px-4 py-3 text-right">{formatFcfa(totaux.totalTTC)}</td>
          </tr>
          <tr style={{ backgroundColor: MEGA_CREAM }}>
            <td className="px-4 py-3 text-base font-bold">Total</td>
            <td className="px-4 py-3 text-right text-base font-bold">
              {formatFcfa(totaux.totalGeneral)}
            </td>
          </tr>
        </tbody>
      </table>

      <SignatureBlock />
    </DocShell>
  );
}
