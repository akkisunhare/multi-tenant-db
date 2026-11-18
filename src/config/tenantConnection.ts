import mongoose, { Connection } from 'mongoose';
import { env } from './env';
import { tenantUserSchema } from '../modules/masterUser/user.schema';
import { tenantDataSchema } from '../modules/data/data.schema';
import { ITenantModels, ITenantUser, ITenantData } from '../types/express';

interface TenantConnectionEntry {
  connection: Connection;
  lastAccessed: number;
}

const MAX_CACHED_TENANT_CONNECTIONS = 50;
const tenantConnectionMap = new Map<string, TenantConnectionEntry>();

const connectionOptions: mongoose.ConnectOptions = {
  maxPoolSize: 5,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const validateDbName = (dbName: string): void => {
  if (!dbName || !/^tenant_[a-zA-Z0-9_-]+$/.test(dbName)) {
    throw new Error(`Invalid tenant database name: ${dbName}`);
  }
};

/**
 * Prunes the least-recently-used tenant connection if cache limit is exceeded.
 */
const pruneOldestConnection = async (): Promise<void> => {
  if (tenantConnectionMap.size < MAX_CACHED_TENANT_CONNECTIONS) {
    return;
  }
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of tenantConnectionMap.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const entry = tenantConnectionMap.get(oldestKey);
    if (entry) {
      try {
        await entry.connection.close();
      } catch (err) {
        console.error(`Error closing pruned tenant connection for ${oldestKey}:`, err);
      }
      tenantConnectionMap.delete(oldestKey);
    }
  }
};

/**
 * Retrieves an active Mongoose connection for a specific tenant database.
 * Uses cached connections if available, or creates a new one using createConnection.
 */
export const getTenantConnection = (dbName: string): Connection => {
  validateDbName(dbName);

  const existing = tenantConnectionMap.get(dbName);
  if (existing) {
    existing.lastAccessed = Date.now();
    return existing.connection;
  }

  pruneOldestConnection();

  const uri = `${env.MONGODB_URI.replace(/\/$/, '')}/${dbName}`;
  const connection = mongoose.createConnection(uri, connectionOptions);

  connection.on('connected', () => {
    console.log(`[TenantConnection] Connected to tenant database: ${dbName}`);
  });

  connection.on('error', (err) => {
    console.error(`[TenantConnection] Error on tenant database ${dbName}:`, err);
  });

  tenantConnectionMap.set(dbName, {
    connection,
    lastAccessed: Date.now(),
  });

  return connection;
};

/**
 * Factory that returns the tenant-specific Mongoose models registered
 * exclusively on the tenant's dedicated connection.
 */
export const getTenantModels = (dbName: string): ITenantModels => {
  const connection = getTenantConnection(dbName);

  // Prevent duplicate model registration on the connection
  const User = (connection.models['User'] ||
    connection.model<ITenantUser>('User', tenantUserSchema)) as mongoose.Model<ITenantUser>;

  const Data = (connection.models['Data'] ||
    connection.model<ITenantData>('Data', tenantDataSchema)) as mongoose.Model<ITenantData>;

  return { User, Data };
};

/**
 * Provisions a new tenant database by compiling models and ensuring all indexes are created.
 */
export const provisionTenantDatabase = async (dbName: string): Promise<void> => {
  validateDbName(dbName);
  const models = getTenantModels(dbName);

  // Initialize and synchronize indexes
  await Promise.all([
    models.User.init(),
    models.Data.init(),
  ]);

  console.log(`[TenantProvisioning] Successfully provisioned database and indexes for: ${dbName}`);
};

/**
 * Closes all cached tenant connections for graceful application shutdown or test cleanup.
 */
export const closeAllTenantConnections = async (): Promise<void> => {
  const closePromises: Promise<any>[] = [];
  for (const [dbName, entry] of tenantConnectionMap.entries()) {
    closePromises.push(
      entry.connection.close().catch((err) => {
        console.error(`Failed to close tenant connection ${dbName}:`, err);
      })
    );
  }
  await Promise.all(closePromises);
  tenantConnectionMap.clear();
};
