import { Request, Response } from 'express';
import { MenuService } from './menu.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class MenuController {
  static getMenu = asyncHandler(async (req: Request, res: Response) => {
    const masterId = req.user?.masterId || (req.user?.accountType === 'master' ? req.user.sub : undefined);
    if (!masterId) {
      return sendError(res, 'Tenant master identity required for menu listing', [], 400);
    }

    const result = await MenuService.getMenu(masterId);
    return sendSuccess(res, 'Menu retrieved successfully', result, 200);
  });

  static invalidateMenu = asyncHandler(async (req: Request, res: Response) => {
    const masterId = req.user?.masterId || (req.user?.accountType === 'master' ? req.user.sub : undefined);
    if (!masterId) {
      return sendError(res, 'Tenant master identity required for cache invalidation', [], 400);
    }

    await MenuService.invalidateMenuCache(masterId);
    return sendSuccess(res, 'Menu cache invalidated successfully', { masterId }, 200);
  });
}
