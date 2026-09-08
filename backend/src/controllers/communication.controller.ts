import { Response, NextFunction } from 'express';
import { CommunicationService } from '../services/communication.service';
import {
  prepareOutreachSchema,
  updateCommunicationStatusSchema,
} from '../validators/communication.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class CommunicationController {
  static async prepareOutreach(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = prepareOutreachSchema.parse(req.body);
      const result = await CommunicationService.prepareOutreach({
        ...validated,
        preparedById: req.user!.userId,
        userRole: req.user?.role,
      });
      return sendSuccess(res, result, 'Outreach prepared successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, requirementId, vehicleId, status, page, limit } = req.query;
      const result = await CommunicationService.listCommunicationHistory({
        customerId: customerId as string,
        requirementId: requirementId as string,
        vehicleId: vehicleId as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return sendSuccess(res, result.logs, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateCommunicationStatusSchema.parse(req.body);
      const log = await CommunicationService.updateStatus(
        req.params.id,
        validated.status,
        validated.notes
      );
      return sendSuccess(res, log, 'Communication status updated');
    } catch (error) {
      next(error);
    }
  }
}
