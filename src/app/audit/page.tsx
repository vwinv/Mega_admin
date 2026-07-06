import { redirect } from "next/navigation";
import { AuditClient } from "@/components/AuditClient";
import { getAuditLogs } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  const logs = await getAuditLogs({ limit: 200 });

  return <AuditClient logs={logs} />;
}
