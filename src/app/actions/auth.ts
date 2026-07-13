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

  if (!user.passwordHash) {
    return {
      ok: false,
      error: "Ce compte est connecté via Google. Le mot de passe ne peut pas être modifié ici.",
    };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Mot de passe actuel incorrect." };
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  revalidatePath("/profil");
  return { ok: true };
}
