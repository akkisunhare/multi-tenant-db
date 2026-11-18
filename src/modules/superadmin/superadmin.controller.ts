import { Request, Response } from 'express';
import { SuperAdminService } from './superadmin.service';
import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class SuperAdminController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await SuperAdminService.login(email, password);
    return sendSuccess(res, 'Superadmin logged in successfully', result, 200);
  });

  static createMaster = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const master = await SuperAdminService.createMaster(name, email, password);
    return sendSuccess(res, 'Master and isolated tenant database provisioned successfully', master, 201);
  });

  static getMasters = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;

    const result = await SuperAdminService.listMasters(page, limit, search);
    return sendSuccess(res, 'Masters retrieved successfully', result, 200);
  });
}
