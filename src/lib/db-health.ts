import { prisma } from "@/lib/prisma";

export async function assertUserTableReady(): Promise<string | null> {
  try {
    await prisma.user.count();
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("no such table") ||
      msg.includes("does not exist") ||
      msg.includes("user") ||
      msg.includes("User")
    ) {
      return "Base non à jour. Exécutez : npm run db:migrate && npm run db:seed-users";
    }
    return `Erreur base de données : ${msg}`;
  }
}
