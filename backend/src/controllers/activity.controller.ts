import { Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service';
import { logActivitySchema } from '../validators/followup.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class ActivityController {
  static async logActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = logActivitySchema.parse(req.body);
      const activity = await ActivityService.logActivity({
        ...validated,
        performedById: req.user?.userId,
      });
      return sendSuccess(res, activity, 'Activity logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listActivities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const requirementId = req.params.requirementId;
      const activities = await ActivityService.listActivities(requirementId);
      return sendSuccess(res, activities);
    } catch (error) {
      next(error);
    }
  }
}
