import { Model } from 'mongoose';

export type AccountType = 'superadmin' | 'master' | 'public' | 'master-user';

export interface IAuthPayload {
  sub: string;
  accountType: AccountType;
  email: string;
  masterId?: string;
  tenantDb?: string;
  name?: string;
}

export interface ITenantUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  masterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenantData {
  _id: string;
  title: string;
  description: string;
  createdBy: string;
  createdByType: 'master' | 'master-user';
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenantModels {
  User: Model<ITenantUser>;
  Data: Model<ITenantData>;
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthPayload;
      tenant?: {
        masterId: string;
        dbName: string;
      };
      tenantModels?: ITenantModels;
    }
  }
}
