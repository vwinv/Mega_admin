"use client";

import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  deleteUser,
  unlinkGoogleAccount,
  updateUser,
  type UserRow,
} from "@/app/actions/users";
import {
  Alert,
  Button,
  Card,
  DataTable,
  FormActions,
  Input,
  Modal,
  PageHeader,
  Select,
} from "@/components/ui";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLE_PRIORITY,
  ROLES,
  type Role,
} from "@/lib/roles";

const FORM_ID = "user-form";

type UserModal =
  | { mode: "create" }
  | { mode: "edit"; user: UserRow };

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="rounded-full bg-mega-50 px-2.5 py-0.5 text-xs font-medium text-mega-800">
      {ROLE_LABELS[role]}
      <span className="ml-1 text-mega-500">· P{ROLE_PRIORITY[role]}</span>
    </span>
  );
}

function RolePermissions({ role }: { role: Role }) {
  return (
    <ul className="mt-2 space-y-1 text-xs text-slate-600">
      {ROLE_PERMISSIONS[role].map((p) => (
        <li key={p} className="flex gap-2">
          <span className="text-mega-500">•</span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

export function UtilisateursClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<UserModal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<Role | "ALL">("ALL");

  const [identifiant, setIdentifiant] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("COMPTABLE");
  const [actif, setActif] = useState(true);

  const filteredUsers = useMemo(() => {
    if (filterRole === "ALL") return users;
    return users.filter((u) => u.role === filterRole);
  }, [users, filterRole]);

  function openCreate() {
    setIdentifiant("");
    setNom("");
    setEmail("");
    setPassword("");
    setRole("COMPTABLE");
    setActif(true);
    setError(null);
    setModal({ mode: "create" });
  }

  function openEdit(user: UserRow) {
    setIdentifiant(user.identifiant);
    setNom(user.nom);
    setEmail(user.email ?? "");
    setPassword("");
    setRole(user.role);
    setActif(user.actif);
    setError(null);
    setModal({ mode: "edit", user });
  }

  function closeModal() {
    setModal(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let result;
    if (modal?.mode === "create") {
      result = await createUser({
        identifiant,
        nom,
        email,
        password: password || undefined,
        role,
      });
    } else if (modal?.mode === "edit") {
      result = await updateUser(modal.user.id, {
        nom,
        email,
        role,
        actif,
        password: password || undefined,
      });
    } else {
      setLoading(false);
      return;
    }

    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    closeModal();
    router.refresh();
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`Supprimer le compte « ${user.nom} » (${user.email}) ?`)) return;
    const result = await deleteUser(user.id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  async function handleUnlinkGoogle(user: UserRow) {
    if (!confirm(`Délier Google pour « ${user.nom} » ?`)) return;
    const result = await unlinkGoogleAccount(user.id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Comptes & accès"
        description="Créez les comptes e-mail, attribuez les profils (priorités) et gérez la connexion Google"
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau compte
        </Button>
      </PageHeader>

      <Card className="mb-6 !p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filtrer par profil
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterRole("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filterRole === "ALL"
                  ? "bg-mega-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tous ({users.length})
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilterRole(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  filterRole === r
                    ? "bg-mega-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {ROLE_LABELS[r]} ({users.filter((u) => u.role === r).length})
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mb-6 overflow-hidden p-0">
        <DataTable>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Nom</th>
              <th>Identifiant</th>
              <th>Profil / Priorité</th>
              <th>Connexion</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  Aucun compte pour ce filtre.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-sm">{user.email ?? ""}</span>
                    </div>
                  </td>
                  <td className="font-medium">{user.nom}</td>
                  <td className="font-mono text-xs text-slate-600">
                    {user.identifiant}
                  </td>
                  <td>
                    <RoleBadge role={user.role} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.usesGoogle && (
                        <span className="badge badge-neutral">Google</span>
                      )}
                      {user.hasPassword && (
                        <span className="badge badge-neutral">Mot de passe</span>
                      )}
                      {!user.usesGoogle && !user.hasPassword && (
                        <span className="text-xs text-amber-600">À configurer</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {user.actif ? (
                      <span className="text-mega-600">Actif</span>
                    ) : (
                      <span className="text-slate-400">Inactif</span>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Gérer
                    </Button>
                    {user.usesGoogle && (
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => handleUnlinkGoogle(user)}
                      >
                        Délier Google
                      </Button>
                    )}
                    {user.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Suppr.
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Profils et priorités</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.slice()
            .sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a])
            .map((r) => (
              <Card key={r} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{ROLE_LABELS[r]}</p>
                  <span className="shrink-0 rounded bg-mega-100 px-2 py-0.5 text-[10px] font-bold text-mega-800">
                    P{ROLE_PRIORITY[r]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{ROLE_DESCRIPTIONS[r]}</p>
                <RolePermissions role={r} />
              </Card>
            ))}
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.mode === "create" ? "Nouveau compte" : "Gérer le compte"}
        description={
          modal?.mode === "create"
            ? "L'e-mail permet la connexion Google. Le mot de passe est optionnel."
            : "Modifiez l'e-mail, le profil (priorité) ou le statut du compte."
        }
        size="lg"
        footer={
          <FormActions
            formId={FORM_ID}
            onCancel={closeModal}
            submitLabel={modal?.mode === "create" ? "Créer le compte" : "Enregistrer"}
            loading={loading}
          />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}

          {modal?.mode === "create" && (
            <Input
              label="Identifiant (connexion classique)"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              required
              placeholder="ex. comptable1"
              autoComplete="off"
            />
          )}

          <Input
            label="Nom complet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />

          <Input
            label="E-mail professionnel"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ex. nom@mega-sn.com"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Profil (priorité d'accès)"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.slice()
                .sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a])
                .map((r) => (
                  <option key={r} value={r}>
                    P{ROLE_PRIORITY[r]} : {ROLE_LABELS[r]}
                  </option>
                ))}
            </Select>

            {modal?.mode === "edit" && (
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Compte actif (autorisé à se connecter)
              </label>
            )}
          </div>

          <Card className="!bg-mega-50/50 !p-4">
            <p className="text-xs font-semibold uppercase text-mega-700">
              Droits du profil sélectionné
            </p>
            <RolePermissions role={role} />
          </Card>

          <Input
            label={
              modal?.mode === "create"
                ? "Mot de passe (optionnel si connexion Google)"
                : "Nouveau mot de passe (vide = inchangé)"
            }
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={false}
            minLength={8}
            autoComplete="new-password"
            placeholder={
              modal?.mode === "create"
                ? "Laisser vide pour Google uniquement"
                : undefined
            }
          />

          {modal?.mode === "edit" && modal.user.usesGoogle && (
            <Alert type="info">
              Ce compte est lié à Google. L&apos;e-mail doit correspondre au compte
              Google du collaborateur.
            </Alert>
          )}
        </form>
      </Modal>
    </div>
  );
}
