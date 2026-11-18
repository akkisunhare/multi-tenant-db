import request from 'supertest';
import app from '../src/app';
import { setupTestEnvironment, teardownTestEnvironment } from './setup';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin';
import { env } from '../src/config/env';

describe('Authentication & Anti-Cross-Login Matrix Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    await seedSuperadmin();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  let superadminToken: string;
  let publicUserToken: string;
  let masterToken: string;
  let masterUserToken: string;

  const testMasterEmail = 'master_auth_test@example.com';
  const testMasterUserEmail = 'user_auth_test@example.com';
  const testPublicEmail = 'public_auth_test@example.com';

  test('1. Superadmin can log in with valid credentials', async () => {
    const res = await request(app)
      .post('/superadmin/login')
      .send({
        email: env.SUPERADMIN_EMAIL,
        password: env.SUPERADMIN_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.superadmin.email).toBe(env.SUPERADMIN_EMAIL.toLowerCase());
    superadminToken = res.body.data.token;
  });

  test('2. Missing JWT returns 401 Unauthorized', async () => {
    const res = await request(app).get('/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('3. Public user can signup successfully', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Public Tester',
        email: testPublicEmail,
        password: 'Password@123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testPublicEmail);
    expect(res.body.data.password).toBeUndefined(); // Never expose passwords
  });

  test('4. Duplicate email in public signup returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Public Tester Duplicate',
        email: testPublicEmail,
        password: 'Password@123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('5. Public user can log in and view profile', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: testPublicEmail,
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();
    publicUserToken = loginRes.body.data.token;

    const profileRes = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${publicUserToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data.email).toBe(testPublicEmail);
  });

  test('6. Superadmin creates a master, then master logs in and creates a tenant user', async () => {
    // Superadmin creates master
    const masterRes = await request(app)
      .post('/superadmin/master')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Master Auth Test',
        email: testMasterEmail,
        password: 'MasterPassword@123',
      });

    expect(masterRes.status).toBe(201);
    expect(masterRes.body.data.dbName).toMatch(/^tenant_/);

    // Master logs in
    const masterLoginRes = await request(app)
      .post('/master/login')
      .send({
        email: testMasterEmail,
        password: 'MasterPassword@123',
      });

    expect(masterLoginRes.status).toBe(200);
    masterToken = masterLoginRes.body.data.token;

    // Master creates tenant user
    const createUserRes = await request(app)
      .post('/master/user')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        name: 'Tenant User Auth Test',
        email: testMasterUserEmail,
        password: 'TenantUser@123',
      });

    expect(createUserRes.status).toBe(201);

    // Tenant user logs in
    const userLoginRes = await request(app)
      .post('/master/user/login')
      .send({
        masterEmail: testMasterEmail,
        email: testMasterUserEmail,
        password: 'TenantUser@123',
      });

    expect(userLoginRes.status).toBe(200);
    expect(userLoginRes.body.data.token).toBeDefined();
    masterUserToken = userLoginRes.body.data.token;
  });

  test('7. Anti-Cross-Login: Public token cannot access master-user profile (returns 403)', async () => {
    const res = await request(app)
      .get('/master/user/profile')
      .set('Authorization', `Bearer ${publicUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('8. Anti-Cross-Login: Master-user token cannot access public profile (returns 403)', async () => {
    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${masterUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('9. Anti-Cross-Login: Public login cannot authenticate tenant users (returns 401)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testMasterUserEmail,
        password: 'TenantUser@123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('10. Anti-Cross-Login: Master-user login cannot authenticate public users (returns 401)', async () => {
    const res = await request(app)
      .post('/master/user/login')
      .send({
        masterEmail: testMasterEmail,
        email: testPublicEmail,
        password: 'Password@123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
