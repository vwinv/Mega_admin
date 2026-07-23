"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/actions/auth";
import { deleteUserSignature, saveUserSignature } from "@/app/actions/signatures";
import { SignatureCaptureModal } from "@/components/SignatureCaptureModal";
import { usePermissions } from "@/components/PermissionsProvider";
import { Alert, Button, Card, Input, PageHeader } from "@/components/ui";
import { ROLE_LABELS, canWrite } from "@/lib/roles";

export function ProfilClient({
  hasPassword,
  usesGoogle,
  savedSignature,
}: {
  hasPassword: boolean;
  usesGoogle: boolean;
  savedSignature: string | null;
}) {
  const router = useRouter();
  const { user } = usePermissions();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sigError, setSigError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sigSuccess, setSigSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);

  if (!user) return null;

  const canEditSignature = canWrite(user.role);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleDeleteSignature() {
    setSigError(null);
    setSigSuccess(false);
    setSigLoading(true);
    const result = await deleteUserSignature();
    setSigLoading(false);
    if (!result.ok) {
      setSigError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Mon profil"
        description="Informations de connexion et sécurité"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Compte
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Nom</dt>
              <dd className="font-medium text-slate-900">{user.nom}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Identifiant</dt>
              <dd className="font-mono text-slate-900">{user.identifiant}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Profil</dt>
              <dd className="font-medium text-mega-700">
                {ROLE_LABELS[user.role]}
              </dd>
            </div>
            {user.email && (
              <div>
                <dt className="text-slate-500">E-mail</dt>
                <dd className="text-slate-900">{user.email}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {hasPassword ? "Changer le mot de passe" : "Sécurité"}
          </h2>
          {!hasPassword ? (
            <p className="mt-4 text-sm text-slate-600">
              {usesGoogle
                ? "Vous vous connectez avec Google. La gestion du mot de passe se fait depuis votre compte Google."
                : "Aucun mot de passe défini pour ce compte."}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && <Alert type="error">{error}</Alert>}
              {success && (
                <Alert type="success">Mot de passe mis à jour avec succès.</Alert>
              )}
              <Input
                label="Mot de passe actuel"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement…" : "Mettre à jour"}
              </Button>
            </form>
          )}
        </Card>

        {canEditSignature && (
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Signature électronique
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Créez votre signature (taper, tracer ou image) pour l&apos;outil
              Signature.
            </p>

            {sigError && (
              <div className="mt-4">
                <Alert type="error">{sigError}</Alert>
              </div>
            )}
            {sigSuccess && (
              <div className="mt-4">
                <Alert type="success">Signature enregistrée avec succès.</Alert>
              </div>
            )}

            {savedSignature && (
              <div className="mt-4 max-w-md rounded-lg border border-slate-200 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={savedSignature}
                  alt="Signature enregistrée"
                  className="max-h-24"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => setSigModalOpen(true)}>
                {savedSignature
                  ? "Modifier la signature"
                  : "Créer une signature"}
              </Button>
              {savedSignature && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={sigLoading}
                  onClick={handleDeleteSignature}
                >
                  Supprimer
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      <SignatureCaptureModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onApply={async (image) => {
          const result = await saveUserSignature(image);
          if (!result.ok) throw new Error(result.error);
          setSigSuccess(true);
          setSigError(null);
          router.refresh();
        }}
        defaultName={user.nom}
        savedSignature={savedSignature}
        allowSave={false}
        title="Créer une signature"
      />
    </div>
  );
}
