import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import requirementRoutes from './requirement.routes';
import vehicleRoutes from './vehicle.routes';
import matchingRoutes from './matching.routes';
import followupRoutes from './followup.routes';
import activityRoutes from './activity.routes';
import communicationRoutes from './communication.routes';
import searchRoutes from './search.routes';
import reportingRoutes from './reporting.routes';
import auditRoutes from './audit.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/requirements', requirementRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/matching', matchingRoutes);
apiRouter.use('/followups', followupRoutes);
apiRouter.use('/activities', activityRoutes);
apiRouter.use('/communications', communicationRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/reports', reportingRoutes);
apiRouter.use('/audit', auditRoutes);

export default apiRouter;
