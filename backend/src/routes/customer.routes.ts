import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/check-duplicate', CustomerController.checkDuplicate);
router.get('/', CustomerController.listCustomers);
router.post('/', CustomerController.createCustomer);
router.get('/:id', CustomerController.getCustomerById);
router.put('/:id', CustomerController.updateCustomer);
router.delete('/:id', requireRoles(Role.ADMIN, Role.MANAGER), CustomerController.deleteCustomer);

export default router;
