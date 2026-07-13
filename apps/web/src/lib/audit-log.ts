type AuditRecord = {
  userId?: string | undefined;
  action: string;
  entityType: string;
  entityId?: string | undefined;
  before?: unknown | undefined;
  after?: unknown | undefined;
  ipHash?: string | undefined;
};

type AuditLogClient = {
  auditLog: {
    create(input: { data: AuditRecord }): Promise<unknown>;
  };
};

// Provide a way to log audits if prisma client is provided or use global
export async function logAudit(
  prisma: unknown,
  data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    ipHash?: string;
    metadata?: unknown;
  },
) {
  try {
    if (hasAuditLogClient(prisma)) {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          before: data.before,
          after: data.after,
          ipHash: data.ipHash,
        },
      });
    } else {
      console.warn(
        "AuditLog DB client not available, logging to console:",
        data,
      );
    }
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}

function hasAuditLogClient(value: unknown): value is AuditLogClient {
  if (!value || typeof value !== "object" || !("auditLog" in value)) {
    return false;
  }
  const auditLog = value.auditLog;
  if (typeof auditLog !== "object" || auditLog === null) return false;
  return "create" in auditLog && typeof auditLog.create === "function";
}
