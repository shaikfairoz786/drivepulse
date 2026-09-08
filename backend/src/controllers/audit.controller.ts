import { Response, NextFunction } from 'express';
import prisma from '../prisma';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuditController {
  static async listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { entity, entityId, action, userId, q, search, page, limit } = req.query;
      const p = Math.max(1, Number(page) || 1);
      const l = Math.min(100, Math.max(1, Number(limit) || 30));
      const skip = (p - 1) * l;

      const where: any = {};
      if (entity) where.entity = entity as string;
      if (entityId) where.entityId = entityId as string;
      if (action) where.action = action as string;
      if (userId) where.userId = userId as string;

      const searchTerm = (q || search) as string;
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        where.OR = [
          { entity: { contains: term, mode: 'insensitive' } },
          { action: { contains: term, mode: 'insensitive' } },
          { entityId: { contains: term, mode: 'insensitive' } },
          { user: { fullName: { contains: term, mode: 'insensitive' } } },
          { user: { email: { contains: term, mode: 'insensitive' } } },
        ];
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: l,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, role: true, email: true } },
          },
        }),
      ]);

      return sendSuccess(res, logs, undefined, 200, {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      });
    } catch (error) {
      next(error);
    }
  }

  static async listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return sendSuccess(res, notifications);
    } catch (error) {
      next(error);
    }
  }

  static async markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await prisma.notification.update({
        where: { id: req.params.id },
        data: { isRead: true },
      });
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllNotificationsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.userId, isRead: false },
        data: { isRead: true },
      });
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
