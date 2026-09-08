import { Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class CustomerController {
  static async checkDuplicate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const mobile = req.query.mobile as string;
      const result = await CustomerService.checkDuplicate(mobile);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createCustomerSchema.parse(req.body);
      const customer = await CustomerService.createCustomer(validated, req.user?.userId);
      return sendSuccess(res, customer, 'Customer created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, city, customerType, source, page, limit } = req.query;
      const result = await CustomerService.listCustomers({
        search: search as string,
        city: city as string,
        customerType: customerType as string,
        source: source as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return sendSuccess(res, result.customers, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.getCustomerById(req.params.id);
      return sendSuccess(res, customer);
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateCustomerSchema.parse(req.body);
      const customer = await CustomerService.updateCustomer(req.params.id, validated, req.user?.userId);
      return sendSuccess(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await CustomerService.deleteCustomer(req.params.id, req.user?.userId);
      return sendSuccess(res, null, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
