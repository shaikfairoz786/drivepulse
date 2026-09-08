import { Router } from 'express';
import { ReportingController } from '../controllers/reporting.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', ReportingController.getDashboardStats);
router.get('/lead-sources', requireRoles(Role.ADMIN, Role.MANAGER), ReportingController.getLeadSourceReport);
router.get('/team-performance', requireRoles(Role.ADMIN, Role.MANAGER), ReportingController.getTeamPerformanceReport);
router.get('/vehicle-demand', requireRoles(Role.ADMIN, Role.MANAGER), ReportingController.getVehicleDemandReport);
router.get('/inventory-opportunities', ReportingController.getInventoryOpportunityReport);

export default router;
