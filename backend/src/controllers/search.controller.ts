import { Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class SearchController {
  static async globalSearch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const results = await SearchService.globalSearch(q);
      return sendSuccess(res, results);
    } catch (error) {
      next(error);
    }
  }
}
