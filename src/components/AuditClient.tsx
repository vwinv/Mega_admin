"use client";

import { useMemo, useState } from "react";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  AUDIT_ENTITY_LABELS,
  type AuditLogRow,
} from "@/lib/audit-types";
import { Card, DataTable, PageHeader, Select, Button } from "@/components/ui";
import { Download } from "lucide-react";

export function AuditClient({ logs }: { logs: AuditLogRow[] }) {
  const [filtreEntity, setFiltreEntity] = useState("");
  const [filtreAction, setFiltreAction] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (filtreEntity && log.entity !== filtreEntity) return false;
      if (filtreAction && log.action !== filtreAction) return false;
      return true;
    });
  }, [logs, filtreEntity, filtreAction]);

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Historique des actions : qui a fait quoi et quand"
      >
        <a href="/api/audit/export" download>
          <Button variant="secondary">
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          label="Type"
          value={filtreEntity}
          onChange={(e) => setFiltreEntity(e.target.value)}
          className="min-w-[180px]"
        >
          <option value="">Tous les types</option>
          {AUDIT_ENTITIES.map((e) => (
            <option key={e} value={e}>
              {AUDIT_ENTITY_LABELS[e] ?? e}
            </option>
          ))}
        </Select>
        <Select
          label="Action"
          value={filtreAction}
          onChange={(e) => setFiltreAction(e.target.value)}
          className="min-w-[160px]"
        >
          <option value="">Toutes les actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Type</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Aucune entrée d&apos;audit pour le moment.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-xs text-slate-600">
                  {new Date(log.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="font-medium">{log.userNom}</td>
                <td>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="text-sm text-slate-600">
                  {AUDIT_ENTITY_LABELS[log.entity] ?? log.entity}
                </td>
                <td className="max-w-md truncate text-sm text-slate-500">
                  {log.details ?? "·"}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>

      <p className="mt-3 text-xs text-slate-500">
        {filtered.length} entrée(s) · 200 dernières actions conservées
      </p>
    </div>
  );
}
