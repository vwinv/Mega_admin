"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { MegaLogo } from "@/components/MegaLogo";
import {
  MEGA_PRODUCTS,
  canSeeProduct,
  type MegaProduct,
} from "@/lib/products";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

function ProductIcon({ product }: { product: MegaProduct }) {
  if (product.id === "finance") {
    return (
      <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
        <path
          d="M18 42c8-18 20-18 28 0"
          fill="none"
          stroke="#5eb3c8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="28" r="10" fill="#7b5ea7" />
        <path
          d="M28 28h8M32 24v8"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text
          x="40"
          y="22"
          fill="#d2b36c"
          fontSize="14"
          fontWeight="700"
          fontFamily="system-ui"
        >
          %
        </text>
      </svg>
    );
  }

  if (product.id === "signature") {
    return (
      <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
        <path
          d="M14 40c6-10 10-4 14-8s6-10 12-6 8 8 12 4"
          fill="none"
          stroke="#1a4a6e"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 48h40"
          stroke="#7eb8da"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white"
      style={{ background: product.tile.accent }}
    >
      {product.name.charAt(0)}
    </div>
  );
}

export function AppsLauncher({ user }: { user: SessionUser }) {
  const products = MEGA_PRODUCTS.filter((p) =>
    canSeeProduct(p, user.role as Role)
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef1f4]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(126,184,218,0.25), transparent 40%), radial-gradient(circle at 80% 10%, rgba(210,179,108,0.18), transparent 35%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <MegaLogo width={120} priority />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[var(--c-blue-950)]">
              {user.nom}
            </p>
            <p className="text-xs text-[var(--c-stone-600)]">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <Link
            href="/profil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--c-blue-800)] shadow-sm ring-1 ring-black/5 transition hover:ring-[var(--c-gold-400)]"
            aria-label="Profil"
            title="Profil"
          >
            <User className="h-4 w-4" />
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--c-clay-700)] shadow-sm ring-1 ring-black/5 transition hover:bg-[var(--c-clay-100)]"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-8 sm:px-10 sm:pt-14">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--c-blue-600)]">
            MEGA SN SARL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-blue-950)] sm:text-4xl">
            Applications
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--c-stone-600)]">
            Choisissez un produit pour commencer. D&apos;autres modules
            s&apos;ajouteront au fur et à mesure.
          </p>
        </div>

        <ul className="mx-auto grid max-w-3xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => {
            const content = (
              <>
                <div
                  className={`mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-[22px] bg-white shadow-[0_8px_24px_rgba(14,36,51,0.08)] ring-1 ring-black/[0.04] transition-all duration-200 ${
                    product.comingSoon
                      ? "opacity-60"
                      : "group-hover:-translate-y-1 group-hover:shadow-[0_14px_32px_rgba(14,36,51,0.14)] group-hover:ring-[var(--c-gold-400)]/50"
                  }`}
                >
                  <ProductIcon product={product} />
                </div>
                <span className="mt-3 block text-center text-[15px] font-medium text-[var(--c-blue-950)]">
                  {product.name}
                </span>
                {product.comingSoon && (
                  <span className="mt-1 block text-center text-[11px] text-[var(--muted)]">
                    Bientôt
                  </span>
                )}
              </>
            );

            return (
              <li key={product.id}>
                {product.comingSoon ? (
                  <div className="group cursor-default">{content}</div>
                ) : (
                  <Link
                    href={product.href}
                    className="group block focus-visible:outline-none"
                    title={product.description}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
