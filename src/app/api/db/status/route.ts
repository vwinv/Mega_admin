import { NextResponse } from "next/server";
import { unauthorizedResponse, requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();

  try {
    const [params, counts] = await Promise.all([
      prisma.parametre.findFirst(),
      Promise.all([
        prisma.categorie.count(),
        prisma.operation.count(),
        prisma.operationCaisse.count(),
        prisma.budgetLigne.count(),
        prisma.user.count(),
      ]),
    ]);

    return NextResponse.json({
      ok: true,
      entreprise: params?.entreprise ?? null,
      annee: params?.annee ?? null,
      tables: {
        categories: counts[0],
        journal: counts[1],
        caisse: counts[2],
        budget: counts[3],
        users: counts[4],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Base de données inaccessible",
        hint: "Lancez : docker compose up -d && npm run db:setup",
      },
      { status: 503 }
    );
  }
}
