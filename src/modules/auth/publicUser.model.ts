import { Schema, Document, Model } from 'mongoose';
import { getPublicConnection } from '../../config/database';

export interface IPublicUser extends Document {
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const publicUserSchema = new Schema<IPublicUser>(
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

export const getPublicUserModel = (): Model<IPublicUser> => {
  const conn = getPublicConnection();
  return (conn.models['PublicUser'] || conn.model<IPublicUser>('PublicUser', publicUserSchema)) as Model<IPublicUser>;
};
