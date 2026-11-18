import { Request, Response } from 'express';
import { MasterUserService } from './masterUser.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class MasterUserController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { masterEmail, email, password } = req.body;
    const result = await MasterUserService.login(masterEmail, email, password);
    return sendSuccess(res, 'Tenant user logged in successfully', result, 200);
  });

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub || !req.user?.masterId) {
      return sendError(res, 'Unauthorized tenant context', [], 401);
    }

    const profile = await MasterUserService.getProfile(req.user.sub, req.user.masterId);
    return sendSuccess(res, 'Tenant user profile retrieved successfully', profile, 200);
  });
}
