"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function userInitials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function NavContent({
  onNavigate,
  role,
}: {
  onNavigate?: () => void;
  role: Role | null;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <>
      {navGroups.map((group) => {
        const items = group.items.filter((item) => canSeeItem(item, role));
        if (items.length === 0) return null;

        return (
          <div key={group.title} className="mb-6 last:mb-0">
            <p className="mb-2 px-2.5 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[var(--c-blue-300)]">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const pending = pendingHref === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      onClick={() => {
                        if (!active) setPendingHref(item.href);
                        onNavigate?.();
                      }}
                      className={`group flex items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-[13.5px] transition-all duration-150 ${
                        active
                          ? "bg-[rgba(210,179,108,0.13)] font-medium text-[var(--c-gold-300)]"
                          : pending
                            ? "bg-white/5 font-medium text-white"
                            : "font-normal text-[var(--c-blue-100)] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {active ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-gold-400)]" />
                      ) : (
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            pending
                              ? "animate-pulse text-white"
                              : "text-[var(--c-blue-300)] group-hover:text-[var(--c-gold-400)]"
                          }`}
                          strokeWidth={2}
                        />
                      )}
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
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/95 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <MegaLogo width={120} priority />
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md p-2 text-[var(--c-clay-700)] hover:bg-[var(--c-clay-100)]"
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
            className="rounded-md p-2 text-[var(--c-stone-600)] hover:bg-[var(--c-stone-100)]"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[rgba(14,36,51,0.55)] backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[246px] shrink-0 flex-col bg-[var(--c-blue-950)] text-[var(--c-stone-50)] transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pb-2 pt-7">
          <div className="flex items-center justify-between gap-2">
            <MegaLogo
              width={96}
              priority
              variant="ivory"
              className="min-w-0"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-1.5 text-[var(--c-blue-300)] hover:bg-white/5 lg:hidden"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3.5 py-5">
          <NavContent onNavigate={() => setMobileOpen(false)} role={role} />
        </nav>

        <div className="border-t border-[var(--sidebar-border)] px-5 py-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--c-gold-500)] text-xs font-semibold text-[var(--c-blue-950)]">
                  {userInitials(user.nom)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white">
                    {user.nom}
                  </p>
                  <p className="truncate text-[11px] text-[var(--c-blue-300)]">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/profil"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5 text-xs text-[var(--c-blue-100)] hover:bg-white/10"
                >
                  <User className="h-3.5 w-3.5" />
                  Profil
                </Link>
                <form action={logout} className="flex-1">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5 text-xs text-[var(--c-blue-100)] hover:bg-[var(--c-clay-700)]/30 hover:text-[var(--c-gold-200)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Déconnexion
                  </button>
                </form>
              </div>
              {!canWrite(user.role) && (
                <p className="text-[10px] text-[var(--c-gold-300)]">
                  Mode lecture seule
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--c-blue-300)]">Non connecté</p>
          )}
          <p className="mt-3 text-[11px] tracking-wide text-[var(--c-blue-300)]">
            Devise · FCFA
          </p>
        </div>
      </aside>
    </>
  );
}

export { canImport, canManageUsers, canWrite };
