import { Schema } from 'mongoose';
import { ITenantData } from '../../types/express';

export const tenantDataSchema = new Schema<ITenantData>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    createdByType: {
      type: String,
      enum: ['master', 'master-user'],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

tenantDataSchema.index({ createdAt: -1 });
