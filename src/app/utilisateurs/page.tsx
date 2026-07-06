import { redirect } from "next/navigation";
import { listUsers } from "@/app/actions/users";
import { UtilisateursClient } from "@/components/UtilisateursClient";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    redirect("/");
  }

  const users = await listUsers();

  return (
    <UtilisateursClient users={users} currentUserId={session.id} />
  );
}
