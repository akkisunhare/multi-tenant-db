import { Schema } from 'mongoose';
import { ITenantUser } from '../../types/express';

export const tenantUserSchema = new Schema<ITenantUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    masterId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound unique index on email within each tenant database
tenantUserSchema.index({ email: 1 }, { unique: true });
