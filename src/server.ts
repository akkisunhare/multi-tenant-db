import app from './app';
import { env } from './config/env';
import { initCentralDB, initPublicDB, closeDatabases } from './config/database';
import { closeAllTenantConnections } from './config/tenantConnection';
import { initRedis, closeRedis } from './config/redis';
import { seedSuperadmin } from './scripts/seedSuperadmin';

const startServer = async () => {
  try {
    console.log('------------------------------------------------------------');
    console.log(' Starting Multi-Tenant User Management Backend Service');
    console.log(` Environment: ${env.NODE_ENV}`);
    console.log('------------------------------------------------------------');

    // 1. Initialize Primary Databases
    console.log('[Bootstrap] Initializing Central DB & Public DB...');
    await Promise.all([initCentralDB(), initPublicDB()]);

    // 2. Initialize Redis Client
    console.log('[Bootstrap] Initializing Redis Client...');
    initRedis();

    // 3. Auto-seed Superadmin if not exists
    console.log('[Bootstrap] Checking Superadmin account...');
    await seedSuperadmin();

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Multi-Tenant Backend running on http://localhost:${env.PORT}`);
      console.log(`[Server] Health check available at: http://localhost:${env.PORT}/health`);
    });

    // Graceful Shutdown Handling
    const handleShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Initiating graceful termination...`);
      server.close(async () => {
        console.log('[Shutdown] HTTP server closed.');
        try {
          await closeDatabases();
          console.log('[Shutdown] Central & Public DB connections closed.');
          await closeAllTenantConnections();
          console.log('[Shutdown] Tenant DB connections closed.');
          await closeRedis();
          console.log('[Shutdown] Redis client disconnected.');
          console.log('[Shutdown] Graceful termination complete.');
          process.exit(0);
        } catch (err: any) {
          console.error('[Shutdown] Error during shutdown:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (err: any) {
    console.error('[Fatal Error] Failed to bootstrap application:', err);
    process.exit(1);
  }
};

startServer();
