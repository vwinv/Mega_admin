"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

export function UserSessionBar({ user }: { user: SessionUser }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-slate-800">{user.nom}</p>
        <p className="text-xs text-slate-500">
          {ROLE_LABELS[user.role]} · {user.identifiant}
        </p>
      </div>
      <Link
        href="/profil"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Profil</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </form>
    </div>
  );
}
