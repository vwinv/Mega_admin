import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export default function LoginPage() {
  const googleEnabled = isGoogleAuthEnabled();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Chargement…
        </div>
      }
    >
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
