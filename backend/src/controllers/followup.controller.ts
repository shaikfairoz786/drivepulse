import { Response, NextFunction } from 'express';
import { FollowUpService } from '../services/followup.service';
import { createFollowUpSchema, completeFollowUpSchema } from '../validators/followup.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class FollowUpController {
  static async createFollowUp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createFollowUpSchema.parse(req.body);
      const followUp = await FollowUpService.createFollowUp({
        ...validated,
        userId: req.user?.userId,
      });
      return sendSuccess(res, followUp, 'Follow-up scheduled successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listFollowUps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { tab, assignedToId, status, page, limit } = req.query;
      const isManagerOrAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
      
      // Non-managers strictly view their own assigned follow-ups
      let effectiveAssignedToId: string | undefined = undefined;
      if (!isManagerOrAdmin) {
        effectiveAssignedToId = req.user?.userId;
      } else if (assignedToId && assignedToId !== 'all') {
        effectiveAssignedToId = assignedToId as string;
      }

      const result = await FollowUpService.listFollowUps({
        tab: tab as any,
        assignedToId: effectiveAssignedToId,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return sendSuccess(res, {
        followUps: result.followUps,
        counts: result.counts,
      }, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async completeFollowUp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = completeFollowUpSchema.parse(req.body);
      const result = await FollowUpService.completeFollowUp(req.params.id, {
        ...validated,
        userId: req.user?.userId,
        userRole: req.user?.role,
      });
      return sendSuccess(res, result, 'Follow-up completed successfully');
    } catch (error) {
      next(error);
    }
  }
}
