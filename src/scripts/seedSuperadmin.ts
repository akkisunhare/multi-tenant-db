import { initCentralDB, closeDatabases } from '../config/database';
import { getSuperAdminModel } from '../modules/superadmin/superadmin.model';
import { hashPassword } from '../utils/password';
import { env } from '../config/env';

export const seedSuperadmin = async () => {
  try {
    console.log('[Seed] Initializing Central DB connection...');
    await initCentralDB();

    const SuperAdmin = getSuperAdminModel();
    const existing = await SuperAdmin.findOne({ email: env.SUPERADMIN_EMAIL.toLowerCase() });

    if (existing) {
      console.log(`[Seed] Superadmin already exists: ${existing.email}`);
      return;
    }

    const hashedPassword = await hashPassword(env.SUPERADMIN_PASSWORD);
    const created = await SuperAdmin.create({
      name: env.SUPERADMIN_NAME,
      email: env.SUPERADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
    });

    console.log(`[Seed] Superadmin created successfully:`);
    console.log(`       ID: ${created._id}`);
    console.log(`       Email: ${created.email}`);
    console.log(`       Password: ${env.SUPERADMIN_PASSWORD}`);
  } catch (err: any) {
    console.error('[Seed] Error seeding superadmin:', err.message);
    throw err;
  }
};

if (require.main === module) {
  seedSuperadmin()
    .then(async () => {
      await closeDatabases();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await closeDatabases();
      process.exit(1);
    });
}
