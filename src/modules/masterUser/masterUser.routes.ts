import { Router } from 'express';
import { MasterUserController } from './masterUser.controller';
import { validateRequest } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { masterUserLoginSchema } from './masterUser.validation';

const router = Router();

router.post(
  '/login',
  validateRequest(masterUserLoginSchema),
  MasterUserController.login
);

router.get(
  '/profile',
  authenticate('master-user'),
  MasterUserController.getProfile
);

export default router;
