import { Response, NextFunction } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export class VehicleController {
  static async createVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createVehicleSchema.parse(req.body);
      const vehicle = await VehicleService.createVehicle(validated, req.user?.userId);
      return sendSuccess(res, vehicle, 'Vehicle added to inventory successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listVehicles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        category,
        status,
        make,
        fuelType,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
        search,
        page,
        limit,
      } = req.query;

      const result = await VehicleService.listVehicles({
        category: category as string,
        status: status as string,
        make: make as string,
        fuelType: fuelType as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minYear: minYear ? Number(minYear) : undefined,
        maxYear: maxYear ? Number(maxYear) : undefined,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return sendSuccess(res, result.vehicles, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const vehicle = await VehicleService.getVehicleById(req.params.id);
      return sendSuccess(res, vehicle);
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateVehicleSchema.parse(req.body);
      const vehicle = await VehicleService.updateVehicle(req.params.id, validated, req.user?.userId);
      return sendSuccess(res, vehicle, 'Vehicle inventory updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const vehicleId = req.params.id;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files were uploaded.' });
      }

      const uploaded = [];
      for (const file of files) {
        const fileUrl = `/uploads/${file.filename}`;
        const img = await VehicleService.addImage(vehicleId, fileUrl);
        uploaded.push(img);
      }

      return sendSuccess(res, uploaded, `${files.length} images uploaded successfully`, 201);
    } catch (error) {
      next(error);
    }
  }

  static async addImageUrl(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { url, isPrimary, caption } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, message: 'Image URL is required' });
      }
      const img = await VehicleService.addImage(req.params.id, url, isPrimary, caption);
      return sendSuccess(res, img, 'Image URL added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async setPrimaryImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const img = await VehicleService.setPrimaryImage(req.params.imageId);
      return sendSuccess(res, img, 'Primary image updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await VehicleService.deleteImage(req.params.imageId);
      return sendSuccess(res, null, 'Image deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
