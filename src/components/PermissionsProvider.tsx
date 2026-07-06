"use client";

import { createContext, useContext, useMemo } from "react";
import type { SessionUser } from "@/lib/session";
import {
  canImport,
  canManageCategories,
  canManageParametres,
  canManageUsers,
  canValidate,
  canWrite,
} from "@/lib/roles";

type Permissions = {
  user: SessionUser | null;
  canWrite: boolean;
  canImport: boolean;
  canManageUsers: boolean;
  canManageParametres: boolean;
  canManageCategories: boolean;
  canValidate: boolean;
};

const PermissionsContext = createContext<Permissions>({
  user: null,
  canWrite: false,
  canImport: false,
  canManageUsers: false,
  canManageParametres: false,
  canManageCategories: false,
  canValidate: false,
});

export function PermissionsProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo<Permissions>(() => {
    const role = user?.role;
    return {
      user,
      canWrite: role ? canWrite(role) : false,
      canImport: role ? canImport(role) : false,
      canManageUsers: role ? canManageUsers(role) : false,
      canManageParametres: role ? canManageParametres(role) : false,
      canManageCategories: role ? canManageCategories(role) : false,
      canValidate: role ? canValidate(role) : false,
    };
  }, [user]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
