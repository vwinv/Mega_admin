import { prisma } from "@/lib/prisma";
import type {
  AuditAction,
  AuditEntity,
  AuditLogRow,
} from "@/lib/audit-types";

export type { AuditAction, AuditEntity, AuditLogRow };
export {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from "@/lib/audit-types";

export async function logAudit(input: {
  userId?: string | null;
  userNom: string;
  action: AuditAction | string;
  entity: AuditEntity | string;
  entityId?: string | null;
  details?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        userNom: input.userNom,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details: input.details ?? null,
      },
    });
  } catch (e) {
    console.error("Échec journal d'audit:", e);
  }
}

export async function getAuditLogs(options?: {
  limit?: number;
  entity?: string;
  action?: string;
}): Promise<AuditLogRow[]> {
  const limit = options?.limit ?? 200;
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(options?.entity ? { entity: options.entity } : {}),
      ...(options?.action ? { action: options.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userNom: r.userNom,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
  }));
}
