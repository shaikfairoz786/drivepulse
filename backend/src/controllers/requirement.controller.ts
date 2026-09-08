import { Response, NextFunction } from 'express';
import { RequirementService } from '../services/requirement.service';
import {
  createRequirementSchema,
  updateRequirementSchema,
  updateStatusSchema,
  assignRequirementSchema,
} from '../validators/requirement.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class RequirementController {
  static async createRequirement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createRequirementSchema.parse(req.body);
      const requirement = await RequirementService.createRequirement(
        validated,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, requirement, 'Requirement created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listRequirements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        status,
        priority,
        category,
        brand,
        assignedToId,
        minBudget,
        maxBudget,
        search,
        page,
        limit,
      } = req.query;

      const result = await RequirementService.listRequirements({
        status: status as string,
        priority: priority as string,
        category: category as string,
        brand: brand as string,
        assignedToId: assignedToId as string,
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return sendSuccess(res, result.requirements, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getRequirementById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const requirement = await RequirementService.getRequirementById(req.params.id);
      return sendSuccess(res, requirement);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateStatusSchema.parse(req.body);
      const requirement = await RequirementService.updateStatus(req.params.id, validated.status, {
        notes: validated.notes,
        lostReason: validated.lostReason,
        wonDealAmount: validated.wonDealAmount,
        vehicleId: validated.vehicleId,
        userId: req.user?.userId,
        userRole: req.user?.role,
      });
      return sendSuccess(res, requirement, `Status updated to ${validated.status}`);
    } catch (error) {
      next(error);
    }
  }

  static async assignRequirement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = assignRequirementSchema.parse(req.body);
      const requirement = await RequirementService.assignRequirement(
        req.params.id,
        validated.assignedToId,
        req.user?.userId,
        req.user?.role
      );
      return sendSuccess(res, requirement, 'Requirement assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateRequirement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateRequirementSchema.parse(req.body);
      const requirement = await RequirementService.updateRequirement(
        req.params.id,
        validated,
        {
          modifierUserId: req.user?.userId,
          userRole: req.user?.role,
        }
      );
      return sendSuccess(res, requirement, 'Requirement updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
