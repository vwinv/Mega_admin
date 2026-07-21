"use client";

import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
  deleteClient,
  updateClient,
  type ClientRow,
} from "@/app/actions/facturation";
import {
  Alert,
  Button,
  Card,
  Fab,
  FormActions,
  Input,
  Modal,
} from "@/components/ui";

const CREATE_FORM_ID = "client-create-form";
const EDIT_FORM_ID = "client-edit-form";

export function ClientsClient({
  clients,
  canEdit,
}: {
  clients: ClientRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  function closeModals() {
    setShowCreate(false);
    setEditing(null);
    setError(null);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await createClient({
      nom: String(fd.get("nom") ?? ""),
      email: String(fd.get("email") ?? "") || undefined,
      telephone: String(fd.get("telephone") ?? "") || undefined,
      adresse: String(fd.get("adresse") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    closeModals();
    router.refresh();
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await updateClient(editing.id, {
      nom: String(fd.get("nom") ?? ""),
      email: String(fd.get("email") ?? "") || undefined,
      telephone: String(fd.get("telephone") ?? "") || undefined,
      adresse: String(fd.get("adresse") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    closeModals();
    router.refresh();
  }

  async function handleDelete(client: ClientRow) {
    if (!confirm(`Supprimer le client « ${client.nom} » ?`)) return;
    const result = await deleteClient(client.id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreate(true)}
            className="hidden lg:inline-flex"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau client
          </Button>
        </div>
      )}

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Adresse</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-slate-500"
                  >
                    Aucun client. Ajoutez-en un pour les devis et factures.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nom}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.telephone ?? "—"}</td>
                    <td className="max-w-[260px] truncate">
                      {c.adresse ?? "—"}
                    </td>
                    {canEdit && (
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            onClick={() => setEditing(c)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs text-red-600"
                            onClick={() => handleDelete(c)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {canEdit && (
        <Fab onClick={() => setShowCreate(true)} label="Nouveau client" />
      )}

      <Modal
        open={showCreate}
        onClose={closeModals}
        title="Nouveau client"
        footer={
          <FormActions
            formId={CREATE_FORM_ID}
            onCancel={closeModals}
            submitLabel="Enregistrer"
          />
        }
      >
        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}
        <form id={CREATE_FORM_ID} onSubmit={handleCreate} className="space-y-4">
          <Input name="nom" label="Nom *" required />
          <Input name="email" label="Email" type="email" />
          <Input name="telephone" label="Téléphone" />
          <Input name="adresse" label="Adresse" />
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={closeModals}
        title="Modifier le client"
        footer={
          <FormActions
            formId={EDIT_FORM_ID}
            onCancel={closeModals}
            submitLabel="Enregistrer"
          />
        }
      >
        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}
        {editing && (
          <form id={EDIT_FORM_ID} onSubmit={handleUpdate} className="space-y-4">
            <Input
              name="nom"
              label="Nom *"
              required
              defaultValue={editing.nom}
            />
            <Input
              name="email"
              label="Email"
              type="email"
              defaultValue={editing.email ?? ""}
            />
            <Input
              name="telephone"
              label="Téléphone"
              defaultValue={editing.telephone ?? ""}
            />
            <Input
              name="adresse"
              label="Adresse"
              defaultValue={editing.adresse ?? ""}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
