import * as XLSX from "xlsx";
import type { MegaData } from "@/lib/import-types";
import { loadDefaultMegaData } from "@/lib/import-data";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findSheet(
  workbook: XLSX.WorkBook,
  ...names: string[]
): string | null {
  const normalizedNames = names.map(normalize);
  for (const sheetName of workbook.SheetNames) {
    const n = normalize(sheetName);
    if (normalizedNames.some((target) => n.includes(target) || target.includes(n))) {
      return sheetName;
    }
  }
  return null;
}

function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });
}

function getField(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalize(alias);
    const key = keys.find((k) => normalize(k) === target || normalize(k).includes(target));
    if (key && row[key] != null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return null;
}

function parseMontant(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.round(value);
  const cleaned = String(value).replace(/\s/g, "").replace(/,/g, "").replace(/fcfa/gi, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

function parseExcelDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const fr = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (fr) {
    let [, d, m, y] = fr;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

function str(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim();
}

function parseParametres(rows: Record<string, unknown>[]): Partial<MegaData> {
  const result: Partial<MegaData> = {};

  if (rows.length === 1 && rows[0].entreprise != null) {
    const r = rows[0];
    result.entreprise = String(getField(r, "entreprise") ?? "MEGA SN SARL");
    result.devise = String(getField(r, "devise") ?? "FCFA");
    result.annee = parseMontant(getField(r, "annee", "année")) ?? new Date().getFullYear();
    result.soldes_initiaux = {
      banque: parseMontant(getField(r, "solde_banque", "solde banque", "banque")) ?? 0,
      caisse: parseMontant(getField(r, "solde_caisse", "solde caisse", "caisse")) ?? 0,
    };
    return result;
  }

  const kv = new Map<string, string>();
  for (const row of rows) {
    const cle = str(getField(row, "cle", "clé", "parametre", "paramètre", "champ"));
    const val = str(getField(row, "valeur", "value"));
    if (cle && val) kv.set(normalize(cle), val);
  }

  if (kv.size > 0) {
    result.entreprise = kv.get("entreprise") ?? "MEGA SN SARL";
    result.devise = kv.get("devise") ?? "FCFA";
    result.annee = parseInt(kv.get("annee") ?? String(new Date().getFullYear()), 10);
    result.soldes_initiaux = {
      banque: parseMontant(kv.get("soldebanque") ?? kv.get("banque")) ?? 0,
      caisse: parseMontant(kv.get("soldecaisse") ?? kv.get("caisse")) ?? 0,
    };
  }

  return result;
}

export function parseExcelBuffer(buffer: Buffer): MegaData {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const defaults = loadDefaultMegaData();

  const paramSheet = findSheet(workbook, "parametres", "paramètres", "config");
  const planSheet = findSheet(workbook, "plancomptable", "plan_comptable", "categories");
  const codesSheet = findSheet(workbook, "codesbudgetaires", "codes_budgetaires", "enveloppes");
  const journalSheet = findSheet(workbook, "journal", "banque");
  const caisseSheet = findSheet(workbook, "petitecaisse", "caisse", "especes");

  const params = paramSheet
    ? parseParametres(sheetToRows(workbook.Sheets[paramSheet]))
    : {};

  const plan_comptable = planSheet
    ? sheetToRows(workbook.Sheets[planSheet])
        .filter((r) => getField(r, "categorie", "catégorie"))
        .map((r) => ({
          categorie: String(getField(r, "categorie", "catégorie")),
          code: String(getField(r, "code", "code_compte", "code compte") ?? ""),
          intitule: String(getField(r, "intitule", "intitulé") ?? getField(r, "categorie", "catégorie")),
          sens: (() => {
            const s = String(getField(r, "sens") ?? "sortie").toLowerCase();
            return s.includes("entree") || s.includes("entrée") ? "entree" : "sortie";
          })(),
        }))
    : defaults.plan_comptable;

  const codes_budgetaires = codesSheet
    ? sheetToRows(workbook.Sheets[codesSheet])
        .filter((r) => getField(r, "code"))
        .map((r) => ({
          code: String(getField(r, "code")).toUpperCase(),
          beneficiaire: String(getField(r, "beneficiaire", "bénéficiaire") ?? ""),
          enveloppe: parseMontant(getField(r, "enveloppe")) ?? 0,
        }))
    : defaults.codes_budgetaires;

  const journal = journalSheet
    ? sheetToRows(workbook.Sheets[journalSheet])
        .filter((r) => getField(r, "libelle", "libellé") || getField(r, "entree", "entrée") || getField(r, "sortie"))
        .map((r) => ({
          date: parseExcelDate(getField(r, "date")),
          piece: str(getField(r, "piece", "pièce", "n_piece", "n° pièce", "numero_piece")),
          libelle: String(getField(r, "libelle", "libellé") ?? ""),
          categorie: String(getField(r, "categorie", "catégorie") ?? ""),
          code_budgetaire: str(getField(r, "code_budgetaire", "code budgétaire", "code_budget")),
          mode: str(getField(r, "mode", "mode_paiement", "mode paiement")),
          entree: parseMontant(getField(r, "entree", "entrée")),
          sortie: parseMontant(getField(r, "sortie")),
          observations: str(getField(r, "observations", "observation")),
        }))
    : [];

  const petite_caisse = caisseSheet
    ? sheetToRows(workbook.Sheets[caisseSheet])
        .filter((r) => getField(r, "motif", "libelle", "libellé") || getField(r, "entree", "entrée") || getField(r, "sortie"))
        .map((r) => ({
          date: parseExcelDate(getField(r, "date")),
          piece: str(getField(r, "piece", "pièce", "n_piece")),
          motif: String(getField(r, "motif", "libelle", "libellé") ?? ""),
          categorie: String(getField(r, "categorie", "catégorie") ?? ""),
          code_budgetaire: str(getField(r, "code_budgetaire", "code budgétaire")),
          entree: parseMontant(getField(r, "entree", "entrée")),
          sortie: parseMontant(getField(r, "sortie")),
        }))
    : [];

  return {
    entreprise: params.entreprise ?? defaults.entreprise,
    devise: params.devise ?? defaults.devise,
    annee: params.annee ?? defaults.annee,
    soldes_initiaux: params.soldes_initiaux ?? defaults.soldes_initiaux,
    plan_comptable,
    codes_budgetaires,
    journal,
    petite_caisse,
  };
}

export function buildExcelTemplate(data?: MegaData): Buffer {
  const source = data ?? loadDefaultMegaData();
  const wb = XLSX.utils.book_new();

  const paramRows = [
    { Paramètre: "entreprise", Valeur: source.entreprise },
    { Paramètre: "devise", Valeur: source.devise },
    { Paramètre: "annee", Valeur: source.annee },
    { Paramètre: "solde_banque", Valeur: source.soldes_initiaux.banque },
    { Paramètre: "solde_caisse", Valeur: source.soldes_initiaux.caisse },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paramRows), "Paramètres");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      source.plan_comptable.map((c) => ({
        categorie: c.categorie,
        code: c.code,
        intitule: c.intitule,
        sens: c.sens,
      }))
    ),
    "Plan comptable"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      source.codes_budgetaires.map((c) => ({
        code: c.code,
        beneficiaire: c.beneficiaire,
        enveloppe: c.enveloppe,
      }))
    ),
    "Codes budgétaires"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      source.journal.map((j) => ({
        date: j.date ?? "",
        piece: j.piece ?? "",
        libelle: j.libelle,
        categorie: j.categorie,
        code_budgetaire: j.code_budgetaire ?? "",
        mode: j.mode ?? "",
        entree: j.entree ?? "",
        sortie: j.sortie ?? "",
        observations: j.observations ?? "",
      }))
    ),
    "Journal"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      source.petite_caisse.map((c) => ({
        date: c.date ?? "",
        piece: c.piece ?? "",
        motif: c.motif,
        categorie: c.categorie,
        code_budgetaire: c.code_budgetaire ?? "",
        entree: c.entree ?? "",
        sortie: c.sortie ?? "",
      }))
    ),
    "Petite caisse"
  );

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
