"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSession,
  destroySession,
  getSession,
  hashPassword,
  requireAuth,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertUserTableReady } from "@/lib/db-health";
import { prisma } from "@/lib/prisma";

export async function login(
  identifiant: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = identifiant.trim().toLowerCase();
  if (!id || !password) {
    return { ok: false, error: "Identifiant et mot de passe obligatoires." };
  }

  const dbErr = await assertUserTableReady();
  if (dbErr) return { ok: false, error: dbErr };

  try {
    const user = await prisma.user.findUnique({ where: { identifiant: id } });
    if (!user || !user.actif) {
      return { ok: false, error: "Identifiant ou mot de passe incorrect." };
    }

    if (!user.passwordHash) {
      return {
        ok: false,
        error:
          "Ce compte utilise la connexion Google. Cliquez sur « Continuer avec Google ».",
      };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { ok: false, error: "Identifiant ou mot de passe incorrect." };
    }

    try {
      await createSession({
        id: user.id,
        identifiant: user.identifiant,
        nom: user.nom,
        role: user.role,
        email: user.email,
      });
    } catch (sessionError) {
      console.error("createSession error:", sessionError);
      const msg =
        sessionError instanceof Error ? sessionError.message : String(sessionError);
      if (msg.includes("AUTH_SECRET")) {
        return {
          ok: false,
          error:
            "AUTH_SECRET manquant ou trop court. Ajoutez-le dans .env / Vercel (min. 16 caractères).",
        };
      }
      return { ok: false, error: `Erreur session : ${msg}` };
    }

    await logAudit({
      userId: user.id,
      userNom: user.nom,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      details: `Connexion · ${user.role}`,
    });

    return { ok: true };
  } catch (error) {
    console.error("login error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Erreur de connexion : ${msg}`,
    };
  }
}

export async function logout(): Promise<void> {
  const user = await getSession();
  if (user) {
    await logAudit({
      userId: user.id,
      userNom: user.nom,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
      details: "Déconnexion",
    });
  }
  await destroySession();
  redirect("/login");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAuth();

  if (newPassword.length < 8) {
    return {
      ok: false,
      error: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { ok: false, error: "Utilisateur introuvable." };

  if (user.passwordHash) {
    if (!currentPassword) {
      return { ok: false, error: "Saisissez votre mot de passe actuel." };
    }
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return { ok: false, error: "Mot de passe actuel incorrect." };
    }
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await logAudit({
    userId: session.id,
    userNom: session.nom,
    action: "UPDATE",
    entity: "User",
    entityId: session.id,
    details: user.passwordHash
      ? "Changement de mot de passe"
      : "Définition d'un mot de passe",
  });

  revalidatePath("/profil");
  return { ok: true };
}

export async function updateOwnProfile(input: {
  nom: string;
  identifiant: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAuth();

  const nom = input.nom.trim();
  const identifiant = input.identifiant.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();

  if (!nom) return { ok: false, error: "Le nom est obligatoire." };
  if (!identifiant || identifiant.length < 3) {
    return {
      ok: false,
      error: "L'identifiant doit contenir au moins 3 caractères.",
    };
  }
  if (!/^[a-z0-9._-]+$/.test(identifiant)) {
    return {
      ok: false,
      error:
        "L'identifiant ne peut contenir que des lettres, chiffres, points, tirets et underscores.",
    };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Saisissez une adresse e-mail valide." };
  }

  const existingIdentifiant = await prisma.user.findFirst({
    where: { identifiant, NOT: { id: session.id } },
  });
  if (existingIdentifiant) {
    return { ok: false, error: "Cet identifiant est déjà utilisé." };
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email, NOT: { id: session.id } },
  });
  if (existingEmail) {
    return { ok: false, error: "Cet e-mail est déjà utilisé par un autre compte." };
  }

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { nom, identifiant, email },
  });

  await createSession({
    id: updated.id,
    identifiant: updated.identifiant,
    nom: updated.nom,
    role: updated.role,
    email: updated.email,
  });

  await logAudit({
    userId: session.id,
    userNom: updated.nom,
    action: "UPDATE",
    entity: "User",
    entityId: session.id,
    details: "Modification du profil",
  });

  revalidatePath("/profil");
  revalidatePath("/");
  return { ok: true };
}
