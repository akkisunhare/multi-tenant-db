import request from 'supertest';
import app from '../src/app';
import { setupTestEnvironment, teardownTestEnvironment } from './setup';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin';
import { env } from '../src/config/env';

describe('Tenant CRUD Operations & Redis Menu Caching Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    await seedSuperadmin();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  let masterAToken: string;
  let masterBToken: string;
  let masterUserAToken: string;

  let masterAItemId: string;
  let masterUserAItemId: string;

  beforeAll(async () => {
    // 1. Superadmin login
    const adminLogin = await request(app)
      .post('/superadmin/login')
      .send({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD });
    const superadminToken = adminLogin.body.data.token;

    // 2. Create Master A & Master B
    await request(app)
      .post('/superadmin/master')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Data Master A', email: 'data.master.a@test.com', password: 'Password@123' });

    await request(app)
      .post('/superadmin/master')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Data Master B', email: 'data.master.b@test.com', password: 'Password@123' });

    // 3. Login Masters
    const loginA = await request(app)
      .post('/master/login')
      .send({ email: 'data.master.a@test.com', password: 'Password@123' });
    masterAToken = loginA.body.data.token;

    const loginB = await request(app)
      .post('/master/login')
      .send({ email: 'data.master.b@test.com', password: 'Password@123' });
    masterBToken = loginB.body.data.token;

    // 4. Master A creates a user
    await request(app)
      .post('/master/user')
      .set('Authorization', `Bearer ${masterAToken}`)
      .send({ name: 'User A1', email: 'usera1@test.com', password: 'User@123' });

    // 5. User A1 logs in
    const userLogin = await request(app)
      .post('/master/user/login')
      .send({ masterEmail: 'data.master.a@test.com', email: 'usera1@test.com', password: 'User@123' });
    masterUserAToken = userLogin.body.data.token;
  });

  test('1. Master A creates data record in Tenant A', async () => {
    const res = await request(app)
      .post('/data')
      .set('Authorization', `Bearer ${masterAToken}`)
      .send({
        title: 'Master A Project Plan',
        description: 'Tenant A confidential documentation',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Master A Project Plan');
    expect(res.body.data.createdByType).toBe('master');
    masterAItemId = res.body.data._id;
  });

  test('2. Master User A creates data record in Tenant A', async () => {
    const res = await request(app)
      .post('/data')
      .set('Authorization', `Bearer ${masterUserAToken}`)
      .send({
        title: 'User A1 Task Item',
        description: 'Assigned to sprint 1',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('User A1 Task Item');
    expect(res.body.data.createdByType).toBe('master-user');
    masterUserAItemId = res.body.data._id;
  });

  test('3. Master A lists all records within Tenant A (both Master and User records)', async () => {
    const res = await request(app)
      .get('/data')
      .set('Authorization', `Bearer ${masterAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
  });

  test('4. Master User A lists records: sees only their own created record', async () => {
    const res = await request(app)
      .get('/data')
      .set('Authorization', `Bearer ${masterUserAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0]._id).toBe(masterUserAItemId);
  });

  test('5. Cross-Tenant Protection: Master B cannot access or modify Master A records (returns 404)', async () => {
    // Master B attempts to GET Master A's item
    const getRes = await request(app)
      .get(`/data/${masterAItemId}`)
      .set('Authorization', `Bearer ${masterBToken}`);
    expect(getRes.status).toBe(404);

    // Master B attempts to PUT Master A's item
    const putRes = await request(app)
      .put(`/data/${masterAItemId}`)
      .set('Authorization', `Bearer ${masterBToken}`)
      .send({ title: 'Hijacked Title' });
    expect(putRes.status).toBe(404);

    // Master B attempts to DELETE Master A's item
    const delRes = await request(app)
      .delete(`/data/${masterAItemId}`)
      .set('Authorization', `Bearer ${masterBToken}`);
    expect(delRes.status).toBe(404);
  });

  test('6. Scope Protection: Master User A cannot edit Master A record', async () => {
    const res = await request(app)
      .put(`/data/${masterAItemId}`)
      .set('Authorization', `Bearer ${masterUserAToken}`)
      .send({ title: 'Unauthorized Edit' });

    expect(res.status).toBe(404);
  });

  test('7. Master User A can update and delete their own record', async () => {
    // Update
    const updateRes = await request(app)
      .put(`/data/${masterUserAItemId}`)
      .set('Authorization', `Bearer ${masterUserAToken}`)
      .send({ title: 'User A1 Task Item (Updated)' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('User A1 Task Item (Updated)');

    // Delete
    const deleteRes = await request(app)
      .delete(`/data/${masterUserAItemId}`)
      .set('Authorization', `Bearer ${masterUserAToken}`);

    expect(deleteRes.status).toBe(200);
  });

  test('8. Redis Menu Caching: verifies caching, TTL, and cache invalidation', async () => {
    // 1st request: generated from source
    const firstRes = await request(app)
      .get('/master/menu')
      .set('Authorization', `Bearer ${masterAToken}`);

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.success).toBe(true);
    expect(firstRes.body.data.source).toBe('generated');
    expect(firstRes.body.data.menu.length).toBeGreaterThan(0);

    // 2nd request: must return from cache
    const secondRes = await request(app)
      .get('/master/menu')
      .set('Authorization', `Bearer ${masterAToken}`);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.source).toBe('cache');

    // Invalidate cache
    const invalidRes = await request(app)
      .post('/master/menu/invalidate')
      .set('Authorization', `Bearer ${masterAToken}`);

    expect(invalidRes.status).toBe(200);

    // 3rd request after invalidation: generated again
    const thirdRes = await request(app)
      .get('/master/menu')
      .set('Authorization', `Bearer ${masterAToken}`);

    expect(thirdRes.status).toBe(200);
    expect(thirdRes.body.data.source).toBe('generated');
  });
});
