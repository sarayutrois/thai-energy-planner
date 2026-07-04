// Import prisma client if available
import { PrismaClient } from "@prisma/client";

// Provide a way to log audits if prisma client is provided or use global
export async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> | any,
  data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    before?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    after?: any;
    ipHash?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
  }
) {
  try {
    if (prisma && prisma.auditLog) {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          before: data.before,
          after: data.after,
          ipHash: data.ipHash,
        }
      });
    } else {
      console.warn("AuditLog DB client not available, logging to console:", data);
    }
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
