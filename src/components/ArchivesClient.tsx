"use client";

import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ArchiveItem,
  ArchiveSource,
  FactureArchiveRow,
} from "@/app/actions/pieces-comptables";
import {
  Alert,
  Card,
  Input,
  Select,
  StatCard,
  StickyToolbar,
} from "@/components/ui";
import { STATUT_FACTURE_LABELS } from "@/lib/facturation";
import { formatFcfa, formatFileSize } from "@/lib/format";
import { MOIS_LABELS } from "@/lib/constants";

const SOURCE_LABELS: Record<ArchiveSource, string> = {
  facture: "Facture",
  journal: "Journal",
  caisse: "Petite caisse",
};

const SOURCE_STYLES: Record<ArchiveSource, string> = {
  facture: "bg-blue-100 text-blue-800",
  journal: "bg-mega-100 text-mega-800",
  caisse: "bg-amber-100 text-amber-900",
};

type Stats = {
  total: number;
  parFacture: number;
  parJournal: number;
  parCaisse: number;
  facturesSansPiece: number;
};

export function ArchivesClient({
  pieces,
  factures,
  stats,
  annee,
}: {
  pieces: ArchiveItem[];
  factures: FactureArchiveRow[];
  stats: Stats;
  annee: number;
}) {
  const [tab, setTab] = useState<"pieces" | "factures">("pieces");
  const [filtreAnnee, setFiltreAnnee] = useState(String(annee));
  const [filtreMois, setFiltreMois] = useState("");
  const [filtreSource, setFiltreSource] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [q, setQ] = useState("");
  const [filtreFacturePiece, setFiltreFacturePiece] = useState("");

  const annees = useMemo(() => {
    const set = new Set<number>([annee]);
    for (const p of pieces) {
      const d = p.dateDocument ?? p.createdAt;
      set.add(new Date(d).getUTCFullYear());
    }
    for (const f of factures) {
      set.add(new Date(f.date).getUTCFullYear());
    }
    return [...set].sort((a, b) => b - a);
  }, [pieces, factures, annee]);

  const piecesFiltrees = useMemo(() => {
    return pieces.filter((p) => {
      const d = new Date(p.dateDocument ?? p.createdAt);
      if (filtreAnnee && d.getUTCFullYear() !== Number(filtreAnnee)) return false;
      if (filtreMois && d.getUTCMonth() + 1 !== Number(filtreMois)) return false;
      if (filtreSource && p.source !== filtreSource) return false;
      if (filtreType && p.typeDocument !== filtreType) return false;
      if (q.trim()) {
        const hay = [
          p.nomOriginal,
          p.libelle ?? "",
          p.reference,
          p.titre,
          p.typeDocument,
          p.uploadedBy ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [pieces, filtreAnnee, filtreMois, filtreSource, filtreType, q]);

  const facturesFiltrees = useMemo(() => {
    return factures.filter((f) => {
      const d = new Date(f.date);
      if (filtreAnnee && d.getUTCFullYear() !== Number(filtreAnnee)) return false;
      if (filtreMois && d.getUTCMonth() + 1 !== Number(filtreMois)) return false;
      if (filtreFacturePiece === "avec" && f.nbPieces === 0) return false;
      if (filtreFacturePiece === "sans" && f.nbPieces > 0) return false;
      if (q.trim()) {
        const hay = `${f.numero} ${f.client} ${f.statut}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [factures, filtreAnnee, filtreMois, filtreFacturePiece, q]);

  /** Organisation par mois pour vue dossiers */
  const parMois = useMemo(() => {
    const map = new Map<string, ArchiveItem[]>();
    for (const p of piecesFiltrees) {
      const d = new Date(p.dateDocument ?? p.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [piecesFiltrees]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pièces archivées" value={String(stats.total)} />
        <StatCard
          label="Sur factures"
          value={String(stats.parFacture)}
          variant="positive"
        />
        <StatCard
          label="Journal + caisse"
          value={String(stats.parJournal + stats.parCaisse)}
        />
        <StatCard
          label="Factures sans pièce"
          value={String(stats.facturesSansPiece)}
          variant={stats.facturesSansPiece > 0 ? "warning" : "positive"}
        />
      </div>

      {stats.facturesSansPiece > 0 && (
        <Alert type="info">
          <strong>{stats.facturesSansPiece}</strong> facture(s) émise(s) sans
          document joint. Ouvrez l&apos;onglet Factures → filtre « Sans pièce »
          pour les compléter.
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("pieces")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "pieces"
              ? "bg-mega-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Pièces comptables ({pieces.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("factures")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "factures"
              ? "bg-mega-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          Factures ({factures.length})
        </button>
      </div>

      <StickyToolbar>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Année"
            value={filtreAnnee}
            onChange={(e) => setFiltreAnnee(e.target.value)}
            className="min-w-[100px]"
          >
            <option value="">Toutes</option>
            {annees.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
          <Select
            label="Mois"
            value={filtreMois}
            onChange={(e) => setFiltreMois(e.target.value)}
            className="min-w-[130px]"
          >
            <option value="">Tous</option>
            {MOIS_LABELS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </Select>

          {tab === "pieces" ? (
            <>
              <Select
                label="Source"
                value={filtreSource}
                onChange={(e) => setFiltreSource(e.target.value)}
                className="min-w-[140px]"
              >
                <option value="">Toutes</option>
                <option value="facture">Facture</option>
                <option value="journal">Journal</option>
                <option value="caisse">Petite caisse</option>
              </Select>
              <Select
                label="Type"
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                className="min-w-[130px]"
              >
                <option value="">Tous</option>
                <option value="FACTURE">Facture PDF</option>
                <option value="JUSTIFICATIF">Justificatif</option>
              </Select>
            </>
          ) : (
            <Select
              label="Pièce jointe"
              value={filtreFacturePiece}
              onChange={(e) => setFiltreFacturePiece(e.target.value)}
              className="min-w-[140px]"
            >
              <option value="">Toutes</option>
              <option value="avec">Avec pièce</option>
              <option value="sans">Sans pièce</option>
            </Select>
          )}

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
            <Input
              label="Recherche"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="N°, client, libellé, fichier…"
              className="pl-9"
            />
          </div>
        </div>
      </StickyToolbar>

      {tab === "pieces" ? (
        piecesFiltrees.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Archive className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                Aucune pièce trouvée. Joignez des documents depuis une facture,
                le journal ou la petite caisse.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {parMois.map(([key, list]) => {
              const [y, m] = key.split("-");
              const moisLabel = MOIS_LABELS[Number(m) - 1] ?? m;
              return (
                <Card key={key} className="overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <FolderOpen className="h-4 w-4 text-mega-600" />
                      {moisLabel} {y}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {list.length} pièce(s)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Date</th>
                          <th className="text-left">Source</th>
                          <th className="text-left">Référence</th>
                          <th className="text-left">Libellé / client</th>
                          <th className="text-left">Fichier</th>
                          <th className="text-right">Taille</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((p) => (
                          <tr key={p.id}>
                            <td className="whitespace-nowrap text-slate-600">
                              {p.dateDocument
                                ? new Date(p.dateDocument).toLocaleDateString(
                                    "fr-FR"
                                  )
                                : ""}
                            </td>
                            <td>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_STYLES[p.source]}`}
                              >
                                {SOURCE_LABELS[p.source]}
                              </span>
                            </td>
                            <td>
                              <Link
                                href={p.hrefParent}
                                className="inline-flex items-center gap-1 font-mono text-xs font-medium text-mega-700 hover:underline"
                              >
                                {p.reference}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </td>
                            <td className="max-w-[180px] truncate">
                              {p.libelle || p.titre}
                            </td>
                            <td className="max-w-[160px] truncate font-medium">
                              {p.nomOriginal}
                              <span className="ml-1 text-[10px] text-slate-400">
                                {p.typeDocument}
                              </span>
                            </td>
                            <td className="text-right text-xs text-slate-500">
                              {p.tailleOctets != null
                                ? formatFileSize(p.tailleOctets)
                                : ""}
                            </td>
                            <td className="text-center">
                              <a
                                href={p.downloadHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-mega-700 hover:bg-mega-50"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Ouvrir
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">N° facture</th>
                  <th className="text-left">Client</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Statut</th>
                  <th className="text-right">TTC</th>
                  <th className="text-center">Pièces</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {facturesFiltrees.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500"
                    >
                      Aucune facture pour ces filtres.
                    </td>
                  </tr>
                )}
                {facturesFiltrees.map((f) => (
                  <tr
                    key={f.id}
                    className={f.nbPieces === 0 ? "bg-amber-50/50" : ""}
                  >
                    <td className="font-mono font-medium">{f.numero}</td>
                    <td>{f.client}</td>
                    <td className="whitespace-nowrap">
                      {new Date(f.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="text-xs">
                      {STATUT_FACTURE_LABELS[f.statut] ?? f.statut}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatFcfa(f.totalTTC)}
                    </td>
                    <td className="text-center">
                      {f.nbPieces > 0 ? (
                        <span className="rounded-full bg-mega-100 px-2 py-0.5 text-xs font-semibold text-mega-800">
                          {f.nbPieces}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">Aucune</span>
                      )}
                    </td>
                    <td className="text-center">
                      <Link
                        href={f.href}
                        className="inline-flex items-center gap-1 text-xs font-medium text-mega-700 hover:underline"
                      >
                        Ouvrir
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
