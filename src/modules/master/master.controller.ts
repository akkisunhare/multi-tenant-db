import { Request, Response } from 'express';
import { MasterService } from './master.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class MasterController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await MasterService.login(email, password);
    return sendSuccess(res, 'Master logged in successfully', result, 200);
  });

  static createUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels || !req.user?.masterId) {
      return sendError(res, 'Tenant context not available', [], 400);
    }

    const { name, email, password } = req.body;
    const user = await MasterService.createTenantUser(
      req.tenantModels,
      req.user.masterId,
      { name, email, password }
    );
    return sendSuccess(res, 'Tenant user created successfully', user, 201);
  });

  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.tenantModels) {
      return sendError(res, 'Tenant context not available', [], 400);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;

    const result = await MasterService.listTenantUsers(req.tenantModels, page, limit, search);
    return sendSuccess(res, 'Tenant users retrieved successfully', result, 200);
  });
}
