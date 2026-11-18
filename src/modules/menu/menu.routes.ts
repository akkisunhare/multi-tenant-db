import { Router } from 'express';
import { MenuController } from './menu.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

const tenantAuth = authenticate(['master', 'master-user']);

router.get(
  '/',
  tenantAuth,
  MenuController.getMenu
);

router.post(
  '/invalidate',
  tenantAuth,
  MenuController.invalidateMenu
);

export default router;
