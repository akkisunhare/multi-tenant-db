import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  CENTRAL_DB_NAME: process.env.CENTRAL_DB_NAME || 'central_db',
  PUBLIC_DB_NAME: process.env.PUBLIC_DB_NAME || 'public_db',

  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  REDIS_ENABLED: process.env.REDIS_ENABLED !== 'false',

  JWT_SUPERADMIN_SECRET: process.env.JWT_SUPERADMIN_SECRET || 'superadmin_jwt_secret_key_prod_quality_2026_x1',
  JWT_MASTER_SECRET: process.env.JWT_MASTER_SECRET || 'master_jwt_secret_key_prod_quality_2026_x2',
  JWT_PUBLIC_SECRET: process.env.JWT_PUBLIC_SECRET || 'public_jwt_secret_key_prod_quality_2026_x3',
  JWT_MASTER_USER_SECRET: process.env.JWT_MASTER_USER_SECRET || 'master_user_jwt_secret_key_prod_quality_2026_x4',

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_ISSUER: process.env.JWT_ISSUER || 'multi-tenant-auth-service',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'multi-tenant-app',

  SUPERADMIN_NAME: process.env.SUPERADMIN_NAME || 'Super Admin',
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'admin@example.com',
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || 'Admin@123',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};
