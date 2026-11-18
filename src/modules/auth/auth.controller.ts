import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class AuthController {
  static signup = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const user = await AuthService.signup({ name, email, password });
    return sendSuccess(res, 'Public user registered successfully', user, 201);
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    return sendSuccess(res, 'Public user logged in successfully', result, 200);
  });

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      return sendError(res, 'Unauthorized', [], 401);
    }
    const profile = await AuthService.getProfile(req.user.sub);
    return sendSuccess(res, 'Public user profile retrieved successfully', profile, 200);
  });
}
