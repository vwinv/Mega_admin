"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  BookOpen,
  Receipt,
  Settings,
  ShieldCheck,
  Upload,
  User,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { MegaLogo } from "@/components/MegaLogo";
import type { SessionUser } from "@/lib/session";
import {
  ROLE_LABELS,
  canImport,
  canManageUsers,
  canWrite,
  type Role,
} from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/tresorerie", label: "Trésorerie", icon: Landmark },
    ],
  },
  {
    title: "Opérations",
    items: [
      { href: "/journal", label: "Journal", icon: Receipt },
      { href: "/caisse", label: "Petite caisse", icon: Wallet },
      { href: "/facturation", label: "Facturation", icon: FileText },
      { href: "/archives", label: "Archives", icon: Archive },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { href: "/budget", label: "Budget", icon: BarChart3 },
      { href: "/codes-budgetaires", label: "Codes budgétaires", icon: Building2 },
      { href: "/plan-comptable", label: "Plan comptable", icon: BookOpen },
      { href: "/synthese", label: "Synthèse comptable", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Conformité",
    items: [
      { href: "/impots", label: "Impôts & taxes", icon: Calculator },
      { href: "/controle", label: "Contrôle financier", icon: ShieldCheck },
    ],
  },
  {
    title: "Système",
    items: [
      {
        href: "/approbations",
        label: "Approbations CEO",
        icon: CheckCircle,
      },
      {
        href: "/import",
        label: "Import Excel",
        icon: Upload,
        roles: ["ADMIN", "COMPTABLE"],
      },
      { href: "/parametres", label: "Paramètres", icon: Settings },
      {
        href: "/utilisateurs",
        label: "Comptes & accès",
        icon: UserCog,
        roles: ["ADMIN"],
      },
      {
        href: "/audit",
        label: "Journal d'audit",
        icon: History,
        roles: ["ADMIN"],
      },
    ],
  },
];

function canSeeItem(item: NavItem, role: Role | null): boolean {
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

function NavContent({
  onNavigate,
  role,
}: {
  onNavigate?: () => void;
  role: Role | null;
}) {
  const pathname = usePathname();

  return (
    <>
      {navGroups.map((group) => {
        const items = group.items.filter((item) => canSeeItem(item, role));
        if (items.length === 0) return null;

        return (
          <div key={group.title} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-mega-500 to-mega-600 font-medium text-white shadow-md shadow-mega-900/25"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active
                            ? "text-white"
                            : "text-slate-500 group-hover:text-mega-400"
                        }`}
                        strokeWidth={active ? 2.2 : 2}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export function Sidebar({ user }: { user: SessionUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role ?? null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <MegaLogo width={150} priority />
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] shrink-0 flex-col border-r border-white/5 bg-[var(--sidebar)] text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-[var(--sidebar-border)] px-4 py-5">
          <div className="flex items-center justify-between gap-2">
            <MegaLogo width={200} priority className="min-w-0" />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 lg:hidden"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <NavContent onNavigate={() => setMobileOpen(false)} role={role} />
        </nav>

        <div className="border-t border-[var(--sidebar-border)] px-5 py-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <User className="h-4 w-4 text-mega-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user.nom}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    {ROLE_LABELS[user.role]} · {user.identifiant}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/profil"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                >
                  <User className="h-3.5 w-3.5" />
                  Profil
                </Link>
                <form action={logout} className="flex-1">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-slate-300 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Déconnexion
                  </button>
                </form>
              </div>
              {!canWrite(user.role) && (
                <p className="text-[10px] text-amber-400/90">Mode lecture seule</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Non connecté</p>
          )}
          <p className="mt-3 text-xs text-slate-500">Devise · FCFA</p>
        </div>
      </aside>
    </>
  );
}

export { canImport, canManageUsers, canWrite };
