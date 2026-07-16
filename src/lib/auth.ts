import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  Role,
  canImport,
  canManageCategories,
  canManageParametres,
  canManageUsers,
  canValidate,
  canWrite,
} from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

export type { SessionUser };

const SESSION_COOKIE = "mega_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (min. 16 caractères). Voir .env.example"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    sub: user.id,
    identifiant: user.identifiant,
    nom: user.nom,
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Session depuis le JWT uniquement (pas de round-trip DB).
 * Mis en cache pour la durée de la requête React : critique pour la navigation.
 * La vérification `actif` se fait sur les actions d'écriture.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const role = payload.role as Role;
    const nom = payload.nom as string;
    const identifiant = payload.identifiant as string;
    const email = (payload.email as string | null) ?? null;

    if (!id || !role || !nom || !identifiant) return null;

    return { id, identifiant, nom, role, email };
  } catch {
    return null;
  }
});

async function assertUserActif(session: SessionUser): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      identifiant: true,
      nom: true,
      role: true,
      email: true,
      actif: true,
    },
  });
  if (!user || !user.actif) {
    throw new Error("Compte désactivé. Contactez l'administrateur.");
  }
  return {
    id: user.id,
    identifiant: user.identifiant,
    nom: user.nom,
    role: user.role as Role,
    email: user.email,
  };
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    if (!id) return null;
    return {
      id,
      identifiant: payload.identifiant as string,
      nom: payload.nom as string,
      role: payload.role as Role,
      email: (payload.email as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Non authentifié. Veuillez vous connecter.");
  return session;
}

export async function requireWrite(): Promise<SessionUser> {
  const session = await assertUserActif(await requireAuth());
  if (!canWrite(session.role)) {
    throw new Error("Accès refusé : votre profil est en lecture seule.");
  }
  return session;
}

export async function requireImport(): Promise<SessionUser> {
  const session = await assertUserActif(await requireAuth());
  if (!canImport(session.role)) {
    throw new Error("Accès refusé : import réservé aux administrateurs et comptables.");
  }
  return session;
}

export async function requireManageUsers(): Promise<SessionUser> {
  const session = await assertUserActif(await requireAuth());
  if (!canManageUsers(session.role)) {
    throw new Error("Accès refusé : gestion des utilisateurs réservée à l'administrateur.");
  }
  return session;
}

export async function requireManageParametres(): Promise<SessionUser> {
  const session = await assertUserActif(await requireAuth());
  if (!canManageParametres(session.role)) {
    throw new Error("Accès refusé : paramètres réservés à l'administrateur.");
  }
  return session;
}

export async function requireManageCategories(): Promise<SessionUser> {
  const session = await assertUserActif(await requireAuth());
  if (!canManageCategories(session.role)) {
    throw new Error("Accès refusé : gestion des catégories non autorisée.");
  }
  return session;
}

export async function requireValidate(): Promise<SessionUser> {
  const session = await assertUserActif(await requireAuth());
  if (!canValidate(session.role)) {
    throw new Error("Accès refusé : vous ne pouvez pas valider cette opération.");
  }
  return session;
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
