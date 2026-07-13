import { NextResponse } from "next/server";
import { unauthorizedResponse, requireApiAuth } from "@/lib/api-auth";
import { buildExcelTemplate } from "@/lib/excel-parser";
import { prisma } from "@/lib/prisma";
import type { MegaData } from "@/lib/import-types";

export async function GET() {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();

  const params = await prisma.parametre.findFirst();

  let data: MegaData | undefined;
  if (params) {
    const [categories, codes, journal, caisse] = await Promise.all([
      prisma.categorie.findMany({ orderBy: { nom: "asc" } }),
      prisma.codeBudgetaire.findMany({ orderBy: { code: "asc" } }),
      prisma.operation.findMany({
        include: { categorie: true, codeBudgetaire: true },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      prisma.operationCaisse.findMany({
        include: { categorie: true, codeBudgetaire: true },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    data = {
      entreprise: params.entreprise,
      devise: params.devise,
      annee: params.annee,
      soldes_initiaux: {
        banque: params.soldeInitialBanque,
        caisse: params.soldeInitialCaisse,
      },
      plan_comptable: categories.map((c) => ({
        categorie: c.nom,
        code: c.codeCompte,
        intitule: c.intituleCompte,
        sens: c.sens,
      })),
      codes_budgetaires: codes.map((c) => ({
        code: c.code,
        beneficiaire: c.beneficiaire,
        enveloppe: c.enveloppe,
      })),
      journal: journal.map((o) => ({
        date: o.date?.toISOString().slice(0, 10) ?? null,
        piece: o.numeroPiece,
        libelle: o.libelle,
        categorie: o.categorie.nom,
        code_budgetaire: o.codeBudgetaire?.code ?? null,
        mode: o.modePaiement,
        entree: o.entree,
        sortie: o.sortie,
        observations: o.observations,
      })),
      petite_caisse: caisse.map((o) => ({
        date: o.date?.toISOString().slice(0, 10) ?? null,
        piece: o.numeroPiece,
        motif: o.libelle,
        categorie: o.categorie.nom,
        code_budgetaire: o.codeBudgetaire?.code ?? null,
        entree: o.entree,
        sortie: o.sortie,
      })),
    };
  }

  const buffer = buildExcelTemplate(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mega-export.xlsx"',
    },
  });
}
