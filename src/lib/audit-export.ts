import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  type AuditLogRow,
} from "@/lib/audit-types";

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function auditLogsToCsv(logs: AuditLogRow[]): string {
  const header = [
    "Date",
    "Utilisateur",
    "Action",
    "Type",
    "ID entité",
    "Détail",
  ].join(",");

  const rows = logs.map((log) =>
    [
      new Date(log.createdAt).toLocaleString("fr-FR"),
      log.userNom,
      AUDIT_ACTION_LABELS[log.action] ?? log.action,
      AUDIT_ENTITY_LABELS[log.entity] ?? log.entity,
      log.entityId ?? "",
      log.details ?? "",
    ]
      .map(escapeCsv)
      .join(",")
  );

  return "\uFEFF" + [header, ...rows].join("\n");
}
