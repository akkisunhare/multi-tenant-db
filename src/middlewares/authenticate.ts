import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AccountType, IAuthPayload } from '../types/express';
import { getSecretForAccountType } from '../utils/jwt';
import { env } from '../config/env';
import { sendError } from '../utils/apiResponse';
import { getMasterModel } from '../modules/superadmin/master.model';
import { getSuperAdminModel } from '../modules/superadmin/superadmin.model';
import { getPublicUserModel } from '../modules/auth/publicUser.model';
import { getTenantModels } from '../config/tenantConnection';

/**
 * Middleware factory that enforces strict authentication and role checking.
 * @param allowedTypes One or more allowed AccountType values ('superadmin', 'master', 'public', 'master-user')
 */
export const authenticate = (allowedTypes: AccountType | AccountType[]) => {
  const allowed = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];

  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authorization token missing or malformed', [], 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Bearer token missing', [], 401);
    }

    // First, inspect the unverified decoded payload to determine claimed accountType
    const decodedUnverified = jwt.decode(token) as any;
    if (!decodedUnverified || !decodedUnverified.accountType) {
      return sendError(res, 'Invalid token payload', [], 401);
    }

    const claimedType = decodedUnverified.accountType as AccountType;

    // Check if the token's claimed accountType is allowed for this endpoint
    if (!allowed.includes(claimedType)) {
      return sendError(
        res,
        `Access forbidden: Cross-login prohibited. '${claimedType}' cannot access this resource.`,
        [],
        403
      );
    }

    // Verify token cryptographically using the specific secret for this accountType
    let payload: IAuthPayload;
    try {
      const secret = getSecretForAccountType(claimedType);
      const verified = jwt.verify(token, secret, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      }) as any;

      payload = {
        sub: verified.sub,
        accountType: verified.accountType,
        email: verified.email,
        name: verified.name,
        masterId: verified.masterId,
        tenantDb: verified.tenantDb,
      };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token has expired', [], 401);
      }
      return sendError(res, `Invalid token: ${err.message}`, [], 401);
    }

    // Validate account status against database to prevent stale / deactivated tokens
    try {
      if (payload.accountType === 'superadmin') {
        const SuperAdmin = getSuperAdminModel();
        const superadmin = await SuperAdmin.findById(payload.sub);
        if (!superadmin) {
          return sendError(res, 'Superadmin account not found', [], 401);
        }
      } else if (payload.accountType === 'public') {
        const PublicUser = getPublicUserModel();
        const user = await PublicUser.findById(payload.sub);
        if (!user) {
          return sendError(res, 'Public user account not found', [], 401);
        }
      } else if (payload.accountType === 'master') {
        const Master = getMasterModel();
        const master = await Master.findById(payload.sub);
        if (!master) {
          return sendError(res, 'Master account not found', [], 401);
        }
        if (master.status !== 'active') {
          return sendError(res, `Master account is not active (status: ${master.status})`, [], 403);
        }
        payload.tenantDb = master.dbName;
        payload.masterId = master._id.toString();

        req.tenant = {
          masterId: master._id.toString(),
          dbName: master.dbName,
        };
        req.tenantModels = getTenantModels(master.dbName);
      } else if (payload.accountType === 'master-user') {
        if (!payload.masterId) {
          return sendError(res, 'Invalid token: Master reference missing', [], 401);
        }
        const Master = getMasterModel();
        const master = await Master.findById(payload.masterId);
        if (!master) {
          return sendError(res, 'Associated master account not found', [], 401);
        }
        if (master.status !== 'active') {
          return sendError(res, `Associated master account is not active (status: ${master.status})`, [], 403);
        }

        payload.tenantDb = master.dbName;

        req.tenant = {
          masterId: master._id.toString(),
          dbName: master.dbName,
        };

        const tenantModels = getTenantModels(master.dbName);
        req.tenantModels = tenantModels;

        // Verify the user exists inside the tenant database
        const tenantUser = await tenantModels.User.findById(payload.sub);
        if (!tenantUser) {
          return sendError(res, 'Tenant user account not found', [], 401);
        }
      }
    } catch (err: any) {
      return sendError(res, `Authentication verification failed: ${err.message}`, [], 500);
    }

    req.user = payload;
    return next();
  };
};
