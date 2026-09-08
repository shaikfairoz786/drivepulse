import { Router } from 'express';
import { MatchingController } from '../controllers/matching.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/vehicle/:vehicleId', MatchingController.getMatchesForVehicle);
router.get('/requirement/:requirementId', MatchingController.getMatchesForRequirement);
router.post('/recalculate', MatchingController.recalculate);
router.patch('/:matchId/ignore', MatchingController.ignoreMatch);

export default router;
