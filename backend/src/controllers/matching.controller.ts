import { Response, NextFunction } from 'express';
import { MatchingEngine } from '../services/matching.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';

export class MatchingController {
  static async getMatchesForVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const vehicleId = req.params.vehicleId;
      const matches = await prisma.vehicleMatch.findMany({
        where: {
          vehicleId,
          isIgnored: false,
          matchScore: { gte: 50 },
        },
        orderBy: { matchScore: 'desc' },
        include: {
          requirement: {
            include: {
              customer: true,
              assignedTo: { select: { id: true, fullName: true, mobile: true } },
              followUps: {
                where: { status: 'PENDING' },
                orderBy: { followUpDate: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      return sendSuccess(res, matches);
    } catch (error) {
      next(error);
    }
  }

  static async getMatchesForRequirement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const requirementId = req.params.requirementId;
      const matches = await prisma.vehicleMatch.findMany({
        where: {
          requirementId,
          isIgnored: false,
          matchScore: { gte: 50 },
        },
        orderBy: { matchScore: 'desc' },
        include: {
          vehicle: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      });

      return sendSuccess(res, matches);
    } catch (error) {
      next(error);
    }
  }

  static async recalculate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await MatchingEngine.recalculateAllMatches();
      return sendSuccess(res, result, 'Matching engine calculation completed');
    } catch (error) {
      next(error);
    }
  }

  static async ignoreMatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const matchId = req.params.matchId;
      const updated = await prisma.vehicleMatch.update({
        where: { id: matchId },
        data: { isIgnored: true },
      });
      return sendSuccess(res, updated, 'Match dismissed');
    } catch (error) {
      next(error);
    }
  }
}
