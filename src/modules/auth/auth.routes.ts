import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { publicSignupSchema, publicLoginSchema } from './auth.validation';

const router = Router();

router.post(
  '/signup',
  validateRequest(publicSignupSchema),
  AuthController.signup
);

router.post(
  '/login',
  validateRequest(publicLoginSchema),
  AuthController.login
);

router.get(
  '/profile',
  authenticate('public'),
  AuthController.getProfile
);

export default router;
