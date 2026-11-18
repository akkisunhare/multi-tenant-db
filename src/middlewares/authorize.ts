import { Request, Response, NextFunction } from 'express';
import { AccountType } from '../types/express';
import { sendError } from '../utils/apiResponse';

export const authorize = (allowedRoles: AccountType | AccountType[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return sendError(res, 'Authentication required', [], 401);
    }

    if (!roles.includes(req.user.accountType)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.accountType}' is not permitted to access this resource`,
        [],
        403
      );
    }

    return next();
  };
};
