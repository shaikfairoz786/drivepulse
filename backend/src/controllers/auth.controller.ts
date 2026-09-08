import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, createUserSchema, updateUserSchema } from '../validators/auth.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated.identifier, validated.password);
      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as any;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const users = await AuthService.listUsers(role, isActive);
      return sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const user = await AuthService.createUser(validated, req.user?.userId);
      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const user = await AuthService.updateUser(req.params.id, validated, req.user?.userId);
      return sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
