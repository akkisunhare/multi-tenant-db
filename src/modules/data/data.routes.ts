import { Router } from 'express';
import { DataController } from './data.controller';
import { validateRequest } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import {
  createDataSchema,
  updateDataSchema,
  dataIdParamSchema,
  listDataQuerySchema,
} from './data.validation';

const router = Router();

// Allow both 'master' and 'master-user' on common tenant CRUD endpoints
const tenantAuth = authenticate(['master', 'master-user']);

router.post(
  '/',
  tenantAuth,
  validateRequest(createDataSchema),
  DataController.create
);

router.get(
  '/',
  tenantAuth,
  validateRequest(listDataQuerySchema),
  DataController.list
);

router.get(
  '/:id',
  tenantAuth,
  validateRequest(dataIdParamSchema),
  DataController.getById
);

router.put(
  '/:id',
  tenantAuth,
  validateRequest(updateDataSchema),
  DataController.update
);

router.delete(
  '/:id',
  tenantAuth,
  validateRequest(dataIdParamSchema),
  DataController.delete
);

export default router;
