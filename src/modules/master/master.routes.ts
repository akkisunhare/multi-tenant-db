import { Router } from 'express';
import { MasterController } from './master.controller';
import { validateRequest } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import {
  masterLoginSchema,
  createTenantUserSchema,
  listTenantUsersQuerySchema,
} from './master.validation';

const router = Router();

router.post(
  '/login',
  validateRequest(masterLoginSchema),
  MasterController.login
);

router.post(
  '/user',
  authenticate('master'),
  validateRequest(createTenantUserSchema),
  MasterController.createUser
);

router.get(
  '/users',
  authenticate('master'),
  validateRequest(listTenantUsersQuerySchema),
  MasterController.getUsers
);

export default router;
