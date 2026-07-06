"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { guardManageUsers, isGuardError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";

export type UserRow = {
  id: string;
  identifiant: string;
  nom: string;
  email: string | null;
  role: Role;
  actif: boolean;
  usesGoogle: boolean;
  hasPassword: boolean;
  createdAt: string;
};

function normalizeEmail(email?: string): string | null {
  const e = email?.trim().toLowerCase();
  return e || null;
}

async function assertEmailAvailable(
  email: string | null,
  excludeId?: string
): Promise<string | null> {
  if (!email) return null;
  const existing = await prisma.user.findFirst({
    where: {
      email,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (existing) {
    return "Cet e-mail est déjà utilisé par un autre compte.";
  }
  return null;
}

export async function listUsers(): Promise<UserRow[]> {
  await requireAuth();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { nom: "asc" }],
  });
  return users.map((u) => ({
    id: u.id,
    identifiant: u.identifiant,
    nom: u.nom,
    email: u.email,
    role: u.role as Role,
    actif: u.actif,
    usesGoogle: Boolean(u.googleId),
    hasPassword: Boolean(u.passwordHash),
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function createUser(input: {
  identifiant: string;
  nom: string;
  email?: string;
  password?: string;
  role: Role;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageUsers();
  if (isGuardError(guard)) return guard;

  const identifiant = input.identifiant.trim().toLowerCase();
  const email = normalizeEmail(input.email);
  const password = input.password?.trim() ?? "";

  if (!identifiant || identifiant.length < 3) {
    return { ok: false, error: "L'identifiant doit contenir au moins 3 caractères." };
  }
  if (!input.nom.trim()) {
    return { ok: false, error: "Le nom est obligatoire." };
  }
  if (!email) {
    return {
      ok: false,
      error: "L'e-mail est obligatoire (connexion Google et identification).",
    };
  }
  if (password && password.length < 8) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }
  if (!ROLES.includes(input.role)) {
    return { ok: false, error: "Rôle invalide." };
  }

  const emailErr = await assertEmailAvailable(email);
  if (emailErr) return { ok: false, error: emailErr };

  const exists = await prisma.user.findUnique({ where: { identifiant } });
  if (exists) {
    return { ok: false, error: "Cet identifiant est déjà utilisé." };
  }

  await prisma.user.create({
    data: {
      identifiant,
      nom: input.nom.trim(),
      email,
      passwordHash: password ? await hashPassword(password) : null,
      role: input.role,
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "CREATE",
    entity: "User",
    details: `${identifiant} · ${input.role}`,
  });

  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function updateUser(
  id: string,
  input: {
    nom: string;
    email?: string;
    role: Role;
    actif: boolean;
    password?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageUsers();
  if (isGuardError(guard)) return guard;

  if (!input.nom.trim()) {
    return { ok: false, error: "Le nom est obligatoire." };
  }
  if (!ROLES.includes(input.role)) {
    return { ok: false, error: "Rôle invalide." };
  }
  if (input.password && input.password.length < 8) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    return { ok: false, error: "L'e-mail est obligatoire." };
  }
  const emailErr = await assertEmailAvailable(email, id);
  if (emailErr) return { ok: false, error: emailErr };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "Utilisateur introuvable." };

  if (target.id === guard.id && !input.actif) {
    return { ok: false, error: "Vous ne pouvez pas désactiver votre propre compte." };
  }
  if (target.id === guard.id && input.role !== "ADMIN") {
    return {
      ok: false,
      error: "Vous ne pouvez pas retirer votre propre rôle administrateur.",
    };
  }

  await prisma.user.update({
    where: { id },
    data: {
      nom: input.nom.trim(),
      email,
      role: input.role,
      actif: input.actif,
      ...(input.password
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    details: input.nom.trim(),
  });

  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function unlinkGoogleAccount(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageUsers();
  if (isGuardError(guard)) return guard;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "Utilisateur introuvable." };
  if (!target.googleId) {
    return { ok: false, error: "Ce compte n'est pas lié à Google." };
  }
  if (!target.passwordHash) {
    return {
      ok: false,
      error: "Définissez d'abord un mot de passe avant de délier Google.",
    };
  }

  await prisma.user.update({
    where: { id },
    data: { googleId: null },
  });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    details: `Déliaison Google · ${target.identifiant}`,
  });

  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function deleteUser(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await guardManageUsers();
  if (isGuardError(guard)) return guard;

  if (id === guard.id) {
    return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const adminCount = await prisma.user.count({
    where: { role: "ADMIN", actif: true },
  });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "Utilisateur introuvable." };
  if (target.role === "ADMIN" && adminCount <= 1) {
    return {
      ok: false,
      error: "Impossible de supprimer le dernier administrateur actif.",
    };
  }

  await prisma.user.delete({ where: { id } });

  await logAudit({
    userId: guard.id,
    userNom: guard.nom,
    action: "DELETE",
    entity: "User",
    entityId: id,
    details: target.identifiant,
  });

  revalidatePath("/utilisateurs");
  return { ok: true };
}
