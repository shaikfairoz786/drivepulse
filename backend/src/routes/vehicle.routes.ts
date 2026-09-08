import { Router } from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { uploadVehicleImages } from '../middleware/upload';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/', VehicleController.listVehicles);
router.post('/', requireRoles(Role.ADMIN, Role.MANAGER), VehicleController.createVehicle);
router.get('/:id', VehicleController.getVehicleById);
router.put('/:id', requireRoles(Role.ADMIN, Role.MANAGER), VehicleController.updateVehicle);

// Images
router.post('/:id/images', requireRoles(Role.ADMIN, Role.MANAGER), uploadVehicleImages.array('images', 10), VehicleController.uploadImages);
router.post('/:id/image-url', requireRoles(Role.ADMIN, Role.MANAGER), VehicleController.addImageUrl);
router.patch('/images/:imageId/primary', requireRoles(Role.ADMIN, Role.MANAGER), VehicleController.setPrimaryImage);
router.delete('/images/:imageId', requireRoles(Role.ADMIN, Role.MANAGER), VehicleController.deleteImage);

export default router;
