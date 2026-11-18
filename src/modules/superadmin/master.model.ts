import { Schema, Document, Model } from 'mongoose';
import { getCentralConnection } from '../../config/database';

export type TenantProvisioningStatus = 'provisioning' | 'active' | 'failed' | 'inactive';

export interface IMaster extends Document {
  name: string;
  email: string;
  password?: string;
  dbName: string;
  status: TenantProvisioningStatus;
  provisioningError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const masterSchema = new Schema<IMaster>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    dbName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['provisioning', 'active', 'failed', 'inactive'],
      default: 'provisioning',
      index: true,
    },
    provisioningError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const getMasterModel = (): Model<IMaster> => {
  const conn = getCentralConnection();
  return (conn.models['Master'] || conn.model<IMaster>('Master', masterSchema)) as Model<IMaster>;
};
