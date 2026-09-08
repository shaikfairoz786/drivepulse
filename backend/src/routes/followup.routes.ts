import { Router } from 'express';
import { FollowUpController } from '../controllers/followup.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', FollowUpController.listFollowUps);
router.post('/', FollowUpController.createFollowUp);
router.patch('/:id/complete', FollowUpController.completeFollowUp);

export default router;
