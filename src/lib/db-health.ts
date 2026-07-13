import { prisma } from "@/lib/prisma";

export async function assertUserTableReady(): Promise<string | null> {
  try {
    await prisma.user.count();
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();

    if (
      lower.includes("can't reach database") ||
      lower.includes("econnrefused") ||
      lower.includes("enotfound") ||
      lower.includes("connection terminated") ||
      lower.includes("timeout")
    ) {
      return "Impossible de joindre la base de données. Vérifiez DATABASE_URL (et SSL pour Render).";
    }

    if (
      lower.includes("password authentication failed") ||
      lower.includes("denied access") ||
      lower.includes("permission denied")
    ) {
      return "Accès refusé à la base. Vérifiez l'utilisateur / mot de passe DATABASE_URL.";
    }

    if (
      lower.includes("does not exist") ||
      lower.includes("no such table") ||
      lower.includes('relation "user"') ||
      lower.includes('relation "User"')
    ) {
      return "Base non à jour. Exécutez : npm run db:deploy && npm run db:seed-users";
    }

    return `Erreur base de données : ${msg}`;
  }
}
