import request from 'supertest';
import app from '../src/app';
import { setupTestEnvironment, teardownTestEnvironment } from './setup';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin';
import { env } from '../src/config/env';

describe('Multi-Tenant Database Isolation Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    await seedSuperadmin();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  let superadminToken: string;
  let masterAToken: string;
  let masterBToken: string;
  let masterADbName: string;
  let masterBDbName: string;

  test('1. Superadmin logs in and creates Master A & Master B with separate databases', async () => {
    const adminLogin = await request(app)
      .post('/superadmin/login')
      .send({
        email: env.SUPERADMIN_EMAIL,
        password: env.SUPERADMIN_PASSWORD,
      });
    superadminToken = adminLogin.body.data.token;

    // Create Master A
    const resA = await request(app)
      .post('/superadmin/master')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Master Alpha',
        email: 'alpha@tenant.com',
        password: 'Password@123',
      });
    expect(resA.status).toBe(201);
    masterADbName = resA.body.data.dbName;

    // Create Master B
    const resB = await request(app)
      .post('/superadmin/master')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Master Beta',
        email: 'beta@tenant.com',
        password: 'Password@123',
      });
    expect(resB.status).toBe(201);
    masterBDbName = resB.body.data.dbName;

    // Verify completely different database names
    expect(masterADbName).toBeDefined();
    expect(masterBDbName).toBeDefined();
    expect(masterADbName).not.toBe(masterBDbName);
    expect(masterADbName).toMatch(/^tenant_/);
    expect(masterBDbName).toMatch(/^tenant_/);
  });

  test('2. Masters log in and acquire independent Master JWTs', async () => {
    const loginA = await request(app)
      .post('/master/login')
      .send({ email: 'alpha@tenant.com', password: 'Password@123' });
    expect(loginA.status).toBe(200);
    masterAToken = loginA.body.data.token;

    const loginB = await request(app)
      .post('/master/login')
      .send({ email: 'beta@tenant.com', password: 'Password@123' });
    expect(loginB.status).toBe(200);
    masterBToken = loginB.body.data.token;
  });

  test('3. Master A creates User in Tenant A; Master B creates User in Tenant B', async () => {
    const userA = await request(app)
      .post('/master/user')
      .set('Authorization', `Bearer ${masterAToken}`)
      .send({
        name: 'User In Alpha',
        email: 'shared.email@company.com', // same email used in both to test tenant isolation!
        password: 'UserAlpha@123',
      });
    expect(userA.status).toBe(201);
    expect(userA.body.data.email).toBe('shared.email@company.com');

    // Creating same email in tenant B MUST succeed because databases are isolated
    const userB = await request(app)
      .post('/master/user')
      .set('Authorization', `Bearer ${masterBToken}`)
      .send({
        name: 'User In Beta',
        email: 'shared.email@company.com',
        password: 'UserBeta@123',
      });
    expect(userB.status).toBe(201);
    expect(userB.body.data.email).toBe('shared.email@company.com');
  });

  test('4. Listing users under Tenant A never returns users from Tenant B', async () => {
    const listA = await request(app)
      .get('/master/users')
      .set('Authorization', `Bearer ${masterAToken}`);

    expect(listA.status).toBe(200);
    expect(listA.body.data.users.length).toBe(1);
    expect(listA.body.data.users[0].name).toBe('User In Alpha');

    const listB = await request(app)
      .get('/master/users')
      .set('Authorization', `Bearer ${masterBToken}`);

    expect(listB.status).toBe(200);
    expect(listB.body.data.users.length).toBe(1);
    expect(listB.body.data.users[0].name).toBe('User In Beta');
  });

  test('5. Duplicate email inside the SAME tenant returns 409 Conflict', async () => {
    const duplicateRes = await request(app)
      .post('/master/user')
      .set('Authorization', `Bearer ${masterAToken}`)
      .send({
        name: 'Duplicate In Alpha',
        email: 'shared.email@company.com',
        password: 'UserAlpha@123',
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
  });
});
