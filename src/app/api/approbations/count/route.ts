import { NextResponse } from "next/server";
import { unauthorizedResponse, requireApiAuth } from "@/lib/api-auth";
import { countPendingApprovals } from "@/app/actions/approbations";
import { canApproveCeo } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireApiAuth();
  if (!session) return unauthorizedResponse();

  const count = await countPendingApprovals();
  return NextResponse.json({
    count,
    canApprove: canApproveCeo(session.role as import("@/lib/roles").Role),
  });
}
