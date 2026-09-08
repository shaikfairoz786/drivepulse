import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', ActivityController.logActivity);
router.get('/requirement/:requirementId', ActivityController.listActivities);

export default router;
