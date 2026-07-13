import { NextResponse } from "next/server";
import { unauthorizedResponse, requireApiAuth } from "@/lib/api-auth";
import { getAuditLogs } from "@/lib/audit";
import { auditLogsToCsv } from "@/lib/audit-export";
import { canManageUsers } from "@/lib/roles";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();
  if (!canManageUsers(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const logs = await getAuditLogs({ limit: 5000 });
  const csv = auditLogsToCsv(logs);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-mega-${date}.csv"`,
    },
  });
}
