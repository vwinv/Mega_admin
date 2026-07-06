import {
  requireAuth,
  requireImport,
  requireManageCategories,
  requireManageParametres,
  requireManageUsers,
  requireWrite,
  type SessionUser,
} from "@/lib/auth";

type GuardError = { ok: false; error: string };

function toGuardError(e: unknown): GuardError {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Accès refusé.",
  };
}

export async function guardAuth(): Promise<SessionUser | GuardError> {
  try {
    return await requireAuth();
  } catch (e) {
    return toGuardError(e);
  }
}

export async function guardWrite(): Promise<SessionUser | GuardError> {
  try {
    return await requireWrite();
  } catch (e) {
    return toGuardError(e);
  }
}

export async function guardImport(): Promise<SessionUser | GuardError> {
  try {
    return await requireImport();
  } catch (e) {
    return toGuardError(e);
  }
}

export async function guardManageUsers(): Promise<SessionUser | GuardError> {
  try {
    return await requireManageUsers();
  } catch (e) {
    return toGuardError(e);
  }
}

export async function guardManageParametres(): Promise<SessionUser | GuardError> {
  try {
    return await requireManageParametres();
  } catch (e) {
    return toGuardError(e);
  }
}

export async function guardManageCategories(): Promise<SessionUser | GuardError> {
  try {
    return await requireManageCategories();
  } catch (e) {
    return toGuardError(e);
  }
}

export function isGuardError(
  result: SessionUser | GuardError
): result is GuardError {
  return "ok" in result && result.ok === false;
}
