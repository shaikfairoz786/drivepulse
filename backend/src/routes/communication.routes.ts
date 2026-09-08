import { Router } from 'express';
import { CommunicationController } from '../controllers/communication.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/prepare', CommunicationController.prepareOutreach);
router.get('/history', CommunicationController.listHistory);
router.patch('/:id/status', CommunicationController.updateStatus);

export default router;
