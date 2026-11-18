import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AccountType, IAuthPayload } from '../types/express';

export const getSecretForAccountType = (accountType: AccountType): string => {
  switch (accountType) {
    case 'superadmin':
      return env.JWT_SUPERADMIN_SECRET;
    case 'master':
      return env.JWT_MASTER_SECRET;
    case 'public':
      return env.JWT_PUBLIC_SECRET;
    case 'master-user':
      return env.JWT_MASTER_USER_SECRET;
    default:
      throw new Error(`Unsupported account type: ${accountType}`);
  }
};

export const signToken = (payload: IAuthPayload): string => {
  const secret = getSecretForAccountType(payload.accountType);

  const signOptions: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    subject: payload.sub,
  };

  return jwt.sign(
    {
      accountType: payload.accountType,
      email: payload.email,
      name: payload.name,
      masterId: payload.masterId,
      tenantDb: payload.tenantDb,
    },
    secret,
    signOptions
  );
};

export const verifyToken = (
  token: string,
  accountType: AccountType
): IAuthPayload => {
  const secret = getSecretForAccountType(accountType);

  const verifyOptions: VerifyOptions = {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };

  const decoded = jwt.verify(token, secret, verifyOptions) as any;

  if (decoded.accountType !== accountType) {
    throw new Error(`Invalid token account type: expected ${accountType}, received ${decoded.accountType}`);
  }

  return {
    sub: decoded.sub,
    accountType: decoded.accountType,
    email: decoded.email,
    name: decoded.name,
    masterId: decoded.masterId,
    tenantDb: decoded.tenantDb,
  };
};
