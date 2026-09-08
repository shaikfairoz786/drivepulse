import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/', requireRoles(Role.ADMIN), AuditController.listAuditLogs);
router.get('/notifications', AuditController.listNotifications);
router.patch('/notifications/:id/read', AuditController.markNotificationRead);
router.patch('/notifications/read-all', AuditController.markAllNotificationsRead);

export default router;
