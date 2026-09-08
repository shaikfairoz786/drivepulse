import prisma from '../prisma';
import { logger } from '../utils/logger';

export interface AuditLogParams {
  userId?: string | null;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'NOTE_ADDED';
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
}
