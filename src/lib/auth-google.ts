import { logAudit } from "@/lib/audit";
import { createSession } from "@/lib/auth";
import type { GoogleAuthConfig, GoogleUserInfo } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

export async function loginWithGoogleProfile(
  profile: GoogleUserInfo,
  config: GoogleAuthConfig
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const email = profile.email.trim().toLowerCase();

  if (profile.email_verified === false) {
    return {
      ok: false,
      code: "google_unverified",
      error: "L'adresse e-mail Google n'est pas vérifiée.",
    };
  }

  if (config.allowedDomain) {
    const domain = email.split("@")[1];
    if (domain !== config.allowedDomain) {
      return {
        ok: false,
        code: "google_domain",
        error: `Seuls les comptes @${config.allowedDomain} sont autorisés.`,
      };
    }
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.sub }, { email }],
    },
  });

  if (!user) {
    return {
      ok: false,
      code: "google_unauthorized",
      error:
        "Ce compte Google n'est pas autorisé. Demandez à l'administrateur d'ajouter votre e-mail.",
    };
  }

  if (!user.actif) {
    return {
      ok: false,
      code: "google_inactive",
      error: "Votre compte est désactivé. Contactez l'administrateur.",
    };
  }

  if (!user.googleId || user.email?.toLowerCase() !== email) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: profile.sub,
        email,
      },
    });
  }

  await createSession({
    id: user.id,
    identifiant: user.identifiant,
    nom: user.nom,
    role: user.role,
    email: user.email,
  });

  await logAudit({
    userId: user.id,
    userNom: user.nom,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    details: `Connexion Google · ${user.role}`,
  });

  return { ok: true };
}
