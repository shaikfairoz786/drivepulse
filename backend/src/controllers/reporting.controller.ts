import { Response, NextFunction } from 'express';
import { ReportingService } from '../services/reporting.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class ReportingController {
  static async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stats = await ReportingService.getDashboardStats(req.user);
      return sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  static async getLeadSourceReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportingService.getLeadSourceReport();
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }

  static async getTeamPerformanceReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportingService.getTeamPerformanceReport();
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleDemandReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportingService.getVehicleDemandReport();
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }

  static async getInventoryOpportunityReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const minScore = req.query.minScore ? Number(req.query.minScore) : 50;
      const report = await ReportingService.getInventoryOpportunityReport(minScore);
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }
}
