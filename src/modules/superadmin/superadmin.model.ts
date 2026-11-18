import { Schema, Document, Model } from 'mongoose';
import { getCentralConnection } from '../../config/database';

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const superAdminSchema = new Schema<ISuperAdmin>(
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const getSuperAdminModel = (): Model<ISuperAdmin> => {
  const conn = getCentralConnection();
  return (conn.models['SuperAdmin'] || conn.model<ISuperAdmin>('SuperAdmin', superAdminSchema)) as Model<ISuperAdmin>;
};
