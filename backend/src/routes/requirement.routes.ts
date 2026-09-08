import { Router } from 'express';
import { RequirementController } from '../controllers/requirement.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/', RequirementController.listRequirements);
router.post('/', RequirementController.createRequirement);
router.get('/:id', RequirementController.getRequirementById);
router.put('/:id', RequirementController.updateRequirement);
router.patch('/:id/status', RequirementController.updateStatus);
router.patch('/:id/assign', requireRoles(Role.ADMIN, Role.MANAGER), RequirementController.assignRequirement);

export default router;
