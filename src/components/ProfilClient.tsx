"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, updateOwnProfile } from "@/app/actions/auth";
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
  const [nom, setNom] = useState(user?.nom ?? "");
  const [identifiant, setIdentifiant] = useState(user?.identifiant ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
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

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileLoading(true);
    const result = await updateOwnProfile({ nom, identifiant, email });
    setProfileLoading(false);
    if (!result.ok) {
      setProfileError(result.error);
      return;
    }
    setProfileSuccess(true);
    router.refresh();
  }

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
    router.refresh();
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
            Modifier mon compte
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Le rôle ({ROLE_LABELS[user.role]}) ne peut être modifié que par un
            administrateur.
          </p>
          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
            {profileError && <Alert type="error">{profileError}</Alert>}
            {profileSuccess && (
              <Alert type="success">Compte mis à jour.</Alert>
            )}
            <Input
              label="Nom complet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label="Identifiant"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              required
              minLength={3}
              autoComplete="username"
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {usesGoogle && (
              <p className="text-xs text-slate-500">
                Si vous changez l&apos;e-mail, utilisez ensuite le même compte
                Google pour vous connecter.
              </p>
            )}
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {hasPassword
              ? "Saisissez votre mot de passe actuel, puis le nouveau (8 caractères minimum)."
              : usesGoogle
                ? "Votre compte utilise Google. Vous pouvez aussi définir un mot de passe pour vous connecter sans Google."
                : "Aucun mot de passe n'est encore défini. Choisissez-en un pour vous connecter."}
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            {success && (
              <Alert type="success">Mot de passe mis à jour avec succès.</Alert>
            )}
            {hasPassword && (
              <Input
                label="Mot de passe actuel"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            )}
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
              {loading
                ? "Enregistrement…"
                : hasPassword
                  ? "Mettre à jour"
                  : "Enregistrer le mot de passe"}
            </Button>
          </form>
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
