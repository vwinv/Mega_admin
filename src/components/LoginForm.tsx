"use client";

import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/app/actions/auth";
import { GOOGLE_LOGIN_ERRORS } from "@/lib/google-auth-errors";
import { MegaLogo } from "@/components/MegaLogo";
import { Alert } from "@/components/ui";

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
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
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
    <div className="login-geo relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
      <div className="relative grid w-full max-w-[1100px] overflow-hidden rounded-[2.25rem] bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] lg:min-h-[640px] lg:grid-cols-[1.15fr_0.95fr]">
        <aside className="relative hidden min-h-[640px] flex-col justify-between p-8 text-white lg:flex xl:p-10">
          <div
            className="absolute inset-0 bg-black bg-cover bg-[center_left] bg-no-repeat"
            style={{ backgroundImage: "url('/login-hero.png')" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"
            aria-hidden
          />

          <div className="relative z-10">
            <MegaLogo width={118} priority variant="ivory" />
          </div>

          <div className="relative z-10 max-w-md pb-2">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight xl:text-[3.5rem]">
              Bienvenue&nbsp;!
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
              Gestion financière MEGA SN SARL · SYSCOHADA
            </p>
          </div>
        </aside>

        <section className="relative z-10 flex items-center bg-white px-6 py-10 sm:px-10 lg:rounded-l-[3rem] lg:px-12 xl:px-14">
          <div className="mx-auto w-full max-w-[360px]">
            <div className="mb-8 lg:hidden">
              <MegaLogo width={130} priority />
            </div>

            <h2 className="text-[2.35rem] font-bold leading-none tracking-tight text-black">
              Connexion
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              {googleEnabled
                ? "Compte Google professionnel MEGA ou identifiant."
                : "Connectez-vous avec votre identifiant MEGA."}
            </p>

            {(error || googleError) && (
              <div className="mt-5">
                <Alert type="error">{error ?? googleError}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="sr-only">Identifiant</span>
                <span className="flex items-center gap-3 rounded-full bg-neutral-100 px-4 py-3.5 transition focus-within:ring-2 focus-within:ring-black/15">
                  <User className="h-[18px] w-[18px] shrink-0 text-neutral-400" />
                  <input
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    autoComplete="username"
                    required={!googleEnabled}
                    placeholder="Identifiant"
                    className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:italic placeholder:text-neutral-400"
                  />
                </span>
              </label>

              <label className="block">
                <span className="sr-only">Mot de passe</span>
                <span className="flex items-center gap-3 rounded-full bg-neutral-100 px-4 py-3.5 transition focus-within:ring-2 focus-within:ring-black/15">
                  <Lock className="h-[18px] w-[18px] shrink-0 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required={!googleEnabled}
                    placeholder="Mot de passe"
                    className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:italic placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-neutral-400 transition hover:text-neutral-700"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 px-1 pt-1 text-[13px]">
                <label className="inline-flex cursor-pointer items-center gap-2 text-neutral-500 italic">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded-full border-neutral-300 text-black focus:ring-black/20"
                  />
                  Se souvenir de moi
                </label>
                <span className="text-neutral-400 italic">Personnel MEGA</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-full bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </form>

            {googleEnabled && (
              <>
                <div className="my-6 flex items-center gap-4 text-xs text-neutral-400">
                  <span className="h-px flex-1 bg-neutral-200" />
                  Ou
                  <span className="h-px flex-1 bg-neutral-200" />
                </div>

                <a
                  href={googleHref}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full bg-neutral-100 px-4 py-3.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200"
                >
                  <GoogleIcon />
                  Continuer avec Google
                </a>
              </>
            )}

            <p className="mt-8 text-center text-xs leading-relaxed text-neutral-400">
              Accès réservé au personnel autorisé de MEGA SN SARL
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
