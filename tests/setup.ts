import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { initCentralDB, initPublicDB, closeDatabases } from '../src/config/database';
import { closeAllTenantConnections } from '../src/config/tenantConnection';
import { clearMemoryCache, closeRedis } from '../src/config/redis';

export const setupTestEnvironment = async () => {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  env.CENTRAL_DB_NAME = `test_central_${randomSuffix}`;
  env.PUBLIC_DB_NAME = `test_public_${randomSuffix}`;
  env.NODE_ENV = 'test';

  clearMemoryCache();
  await Promise.all([initCentralDB(), initPublicDB()]);
};

export const teardownTestEnvironment = async () => {
  try {
    const centralConn = mongoose.connection.useDb(env.CENTRAL_DB_NAME);
    await centralConn.dropDatabase().catch(() => {});

    const publicConn = mongoose.connection.useDb(env.PUBLIC_DB_NAME);
    await publicConn.dropDatabase().catch(() => {});

    await closeAllTenantConnections();
    await closeDatabases();
    await closeRedis();
  } catch (err) {
    // Ignore teardown errors
  }
};
