import { Router } from 'express';
import { SuperAdminController } from './superadmin.controller';
import { validateRequest } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import {
  superAdminLoginSchema,
  createMasterSchema,
  listMastersQuerySchema,
} from './superadmin.validation';

const router = Router();

router.post(
  '/login',
  validateRequest(superAdminLoginSchema),
  SuperAdminController.login
);

router.post(
  '/master',
  authenticate('superadmin'),
  validateRequest(createMasterSchema),
  SuperAdminController.createMaster
);

router.get(
  '/masters',
  authenticate('superadmin'),
  validateRequest(listMastersQuerySchema),
  SuperAdminController.getMasters
);

export default router;
