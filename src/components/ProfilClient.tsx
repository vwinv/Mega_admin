"use client";

import { FormEvent, useState } from "react";
import { changePassword } from "@/app/actions/auth";
import { usePermissions } from "@/components/PermissionsProvider";
import { Alert, Button, Card, Input, PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/roles";

export function ProfilClient({
  hasPassword,
  usesGoogle,
}: {
  hasPassword: boolean;
  usesGoogle: boolean;
}) {
  const { user } = usePermissions();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

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
      </div>
    </div>
  );
}
