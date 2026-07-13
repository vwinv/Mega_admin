import { NextResponse } from "next/server";
import { unauthorizedResponse, requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getSyntheseComptable, syntheseToCsv } from "@/lib/synthese";

export async function GET() {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();

  const params = await prisma.parametre.findFirst();
  if (!params) {
    return NextResponse.json({ error: "Base non initialisée" }, { status: 404 });
  }

  const lignes = await getSyntheseComptable();
  const csv = syntheseToCsv(lignes, params.entreprise, params.annee);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="synthese-${params.annee}.csv"`,
    },
  });
}
