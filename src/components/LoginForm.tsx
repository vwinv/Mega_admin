"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/app/actions/auth";
import { GOOGLE_LOGIN_ERRORS } from "@/lib/google-auth-errors";
import { MegaLogo } from "@/components/MegaLogo";
import { Alert, Button, Input } from "@/components/ui";

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleErrorCode = searchParams.get("error");
  const googleError =
    googleErrorCode && GOOGLE_LOGIN_ERRORS[googleErrorCode]
      ? GOOGLE_LOGIN_ERRORS[googleErrorCode]
      : null;

  const from = searchParams.get("from") || "/";
  const googleHref = `/api/auth/google?from=${encodeURIComponent(from)}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(identifiant, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    window.location.href = from;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[440px_1fr]">
      <aside className="relative hidden flex-col justify-between bg-gradient-to-b from-[var(--c-blue-900)] to-[var(--c-blue-950)] px-11 py-12 text-[var(--c-stone-50)] lg:flex">
        <MegaLogo width={132} priority variant="ivory" />
        <div className="flex max-w-sm flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--c-gold-300)]">
            Mega SN SARL
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            La gestion financière, avec sérénité.
          </h1>
          <p className="text-[15px] font-normal leading-relaxed text-[var(--c-blue-200)]">
            Trésorerie, journal, facturation et conformité SYSCOHADA, réunis
            dans un seul espace sécurisé.
          </p>
        </div>
        <p className="text-xs tracking-wide text-[var(--c-blue-300)]">
          SYSCOHADA · FCFA · Accès réservé au personnel
        </p>
      </aside>

      <div className="flex items-center justify-center bg-[var(--background)] px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <MegaLogo width={140} priority />
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Connexion
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--c-stone-600)]">
              {googleEnabled
                ? "Connectez-vous avec votre compte Google professionnel MEGA."
                : "Connectez-vous avec votre identifiant MEGA."}
            </p>
          </div>

          {(error || googleError) && (
            <div className="mt-5">
              <Alert type="error">{error ?? googleError}</Alert>
            </div>
          )}

          <a
            href={googleHref}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--c-blue-400)]"
          >
            <GoogleIcon />
            Continuer avec Google
          </a>

          <div className="my-5 flex items-center gap-3.5 text-xs text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            ou
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Identifiant"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              autoComplete="username"
              required={!googleEnabled}
              placeholder="prenom.nom"
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required={!googleEnabled}
              placeholder="••••••••"
            />
            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
            Accès réservé au personnel autorisé de MEGA SN SARL
          </p>
        </div>
      </div>
    </div>
  );
}
