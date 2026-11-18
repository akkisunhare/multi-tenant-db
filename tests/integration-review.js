const http = require('http');
function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: '127.0.0.1', port: 5000, path, method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, body: { raw: d } }); }
      });
    });
    r.on('error', e => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  let pass = 0, fail = 0;
  const check = (label, cond, detail) => {
    if (cond) { console.log('PASS', label, detail || ''); pass++; }
    else { console.log('FAIL', label, detail || ''); fail++; }
  };

  // =========================================================================
  // SETUP: Get tokens
  // =========================================================================
  const adminLogin = await req('POST', '/superadmin/login', { email: 'admin@example.com', password: 'Admin@123' });
  const adminToken = adminLogin.body && adminLogin.body.data && adminLogin.body.data.token;
  check('SuperAdmin login', adminLogin.status === 200 && !!adminToken, 'status=' + adminLogin.status);

  // List masters
  const masters = await req('GET', '/superadmin/masters', null, adminToken);
  check('GET /superadmin/masters pagination', masters.status === 200 && !!masters.body.data.pagination);

  // Password field should NOT appear in masters listing response
  const masterJson = JSON.stringify(masters.body.data.masters);
  const noPasswordInList = !masterJson.includes('"password":"') && !masterJson.includes('"password":"$2');
  check('Passwords NOT exposed in masters listing', noPasswordInList, noPasswordInList ? '' : 'password hash found in response!');

  const maLogin = await req('POST', '/master/login', { email: 'review.a@test.com', password: 'Pass@1234' });
  const masterAToken = maLogin.body && maLogin.body.data && maLogin.body.data.token;
  check('Master A login', maLogin.status === 200 && !!masterAToken);

  const mbLogin = await req('POST', '/master/login', { email: 'review.b@test.com', password: 'Pass@1234' });
  const masterBToken = mbLogin.body && mbLogin.body.data && mbLogin.body.data.token;
  check('Master B login', mbLogin.status === 200 && !!masterBToken);

  // =========================================================================
  // Public user flows
  // =========================================================================
  const testRand = Date.now();
  const pubEmail = `review_${testRand}@test.com`;
  const pubSignup = await req('POST', '/auth/signup', { name: 'Review Public', email: pubEmail, password: 'Pass@1234' });
  check('Public signup', pubSignup.status === 201, 'status=' + pubSignup.status);
  check('Password not exposed in signup response', !pubSignup.body.data.password);

  const pubLogin = await req('POST', '/auth/login', { email: pubEmail, password: 'Pass@1234' });
  const publicToken = pubLogin.body && pubLogin.body.data && pubLogin.body.data.token;
  check('Public login', pubLogin.status === 200 && !!publicToken);

  const pubProfile = await req('GET', '/auth/profile', null, publicToken);
  check('Public profile GET', pubProfile.status === 200, 'status=' + pubProfile.status);
  check('Password not in profile response', !pubProfile.body.data.password);

  // =========================================================================
  // Cross-login matrix
  // =========================================================================
  const c1 = await req('GET', '/master/users', null, publicToken);
  check('Cross-login: public->master/users returns 403', c1.status === 403, 'status=' + c1.status);

  const c2 = await req('GET', '/master/user/profile', null, publicToken);
  check('Cross-login: public->master/user/profile returns 403', c2.status === 403, 'status=' + c2.status);

  const c3 = await req('GET', '/auth/profile', null, masterAToken);
  check('Cross-login: master->auth/profile returns 403', c3.status === 403, 'status=' + c3.status);

  const c4 = await req('GET', '/data', null, publicToken);
  check('Cross-login: public->data returns 403', c4.status === 403, 'status=' + c4.status);

  const c5 = await req('POST', '/master/user/login', { masterEmail: 'review.a@test.com', email: pubEmail, password: 'Pass@1234' });
  check('Cross-login: public email cannot auth via master/user/login (401)', c5.status === 401, 'status=' + c5.status);

  const noToken = await req('GET', '/auth/profile', null, null);
  check('No JWT returns 401', noToken.status === 401, 'status=' + noToken.status);

  // =========================================================================
  // Master user login and profile
  // =========================================================================
  const muLogin = await req('POST', '/master/user/login', { masterEmail: 'review.a@test.com', email: 'shared@test.com', password: 'Pass@1234' });
  const masterUserToken = muLogin.body && muLogin.body.data && muLogin.body.data.token;
  check('Master User login', muLogin.status === 200 && !!masterUserToken, 'status=' + muLogin.status);

  const muProfile = await req('GET', '/master/user/profile', null, masterUserToken);
  check('Master User profile', muProfile.status === 200, 'status=' + muProfile.status);
  check('Master User profile no password exposed', !muProfile.body.data.password);

  const c6 = await req('GET', '/auth/profile', null, masterUserToken);
  check('Cross-login: master-user->auth/profile returns 403', c6.status === 403, 'status=' + c6.status);

  const c7 = await req('GET', '/superadmin/masters', null, masterAToken);
  check('Cross-login: master->superadmin/masters returns 403', c7.status === 403, 'status=' + c7.status);

  // =========================================================================
  // Tenant CRUD - derived identity only from JWT
  // =========================================================================
  const dataCreate = await req('POST', '/data', { title: 'Review Doc', description: 'Test record' }, masterAToken);
  const dataId = dataCreate.body && dataCreate.body.data && dataCreate.body.data._id;
  check('Master A creates data record in tenant DB', dataCreate.status === 201 && !!dataId, 'status=' + dataCreate.status);
  check('Data createdByType is master', dataCreate.body.data.createdByType === 'master');

  const dataList = await req('GET', '/data', null, masterAToken);
  check('Master A lists data (tenant-scoped)', dataList.status === 200, 'status=' + dataList.status);

  // Master B cannot GET Master A's specific record
  const crossData1 = await req('GET', '/data/' + dataId, null, masterBToken);
  check('Cross-tenant: Master B cannot GET Master A record (404)', crossData1.status === 404, 'status=' + crossData1.status);

  // Master B cannot PUT Master A's record
  const crossData2 = await req('PUT', '/data/' + dataId, { title: 'Hacked' }, masterBToken);
  check('Cross-tenant: Master B cannot PUT Master A record (404)', crossData2.status === 404, 'status=' + crossData2.status);

  // Master B cannot DELETE Master A's record
  const crossData3 = await req('DELETE', '/data/' + dataId, null, masterBToken);
  check('Cross-tenant: Master B cannot DELETE Master A record (404)', crossData3.status === 404, 'status=' + crossData3.status);

  // Master user creates record
  const muData = await req('POST', '/data', { title: 'User Doc', description: 'By tenant user' }, masterUserToken);
  const muDataId = muData.body && muData.body.data && muData.body.data._id;
  check('Master User creates data in correct tenant DB', muData.status === 201 && !!muDataId, 'status=' + muData.status);
  check('Data createdByType is master-user', muData.body.data.createdByType === 'master-user');

  // Master user cannot edit master's record
  const scopeCheck = await req('PUT', '/data/' + dataId, { title: 'Unauthorized' }, masterUserToken);
  check('Scope: master-user cannot edit master record (404)', scopeCheck.status === 404, 'status=' + scopeCheck.status);

  // Master user can edit own record
  const selfEdit = await req('PUT', '/data/' + muDataId, { title: 'User Doc Updated' }, masterUserToken);
  check('Scope: master-user CAN edit own record', selfEdit.status === 200, 'status=' + selfEdit.status);

  // =========================================================================
  // Redis / menu caching
  // =========================================================================
  // Clear any existing cache first to test fresh generation deterministically
  await req('POST', '/master/menu/invalidate', null, masterAToken);
  await req('POST', '/master/menu/invalidate', null, masterBToken);

  const menu1 = await req('GET', '/master/menu', null, masterAToken);
  check('Menu endpoint returns 200', menu1.status === 200, 'status=' + menu1.status);
  check('Menu has correct items', Array.isArray(menu1.body.data.menu) && menu1.body.data.menu.length === 4);
  check('First request is generated', menu1.body.data.source === 'generated', 'source=' + menu1.body.data.source);

  const menu2 = await req('GET', '/master/menu', null, masterAToken);
  check('Second request served from cache', menu2.body.data.source === 'cache', 'source=' + menu2.body.data.source);

  // Master B menu is NOT served from Master A cache (tenant-specific keys)
  const menuB = await req('GET', '/master/menu', null, masterBToken);
  check('Master B first menu is generated (independent cache key)', menuB.body.data.source === 'generated', 'source=' + menuB.body.data.source);

  const invalidate = await req('POST', '/master/menu/invalidate', null, masterAToken);
  check('Menu cache invalidation', invalidate.status === 200);

  const menu3 = await req('GET', '/master/menu', null, masterAToken);
  check('After invalidation menu is re-generated', menu3.body.data.source === 'generated', 'source=' + menu3.body.data.source);

  // =========================================================================
  // Validation checks
  // =========================================================================
  const badEmail = await req('POST', '/auth/signup', { name: 'Bad', email: 'notanemail', password: 'Pass@1234' });
  check('Validation: invalid email returns 400', badEmail.status === 400, 'status=' + badEmail.status);

  const shortPw = await req('POST', '/auth/signup', { name: 'Bad', email: 'bad@test.com', password: '123' });
  check('Validation: short password returns 400', shortPw.status === 400, 'status=' + shortPw.status);

  const dupEmail = await req('POST', '/auth/signup', { name: 'Dup', email: pubEmail, password: 'Pass@1234' });
  check('Validation: duplicate email returns 409', dupEmail.status === 409, 'status=' + dupEmail.status);

  const badId = await req('GET', '/data/notanobjectid', null, masterAToken);
  check('Validation: invalid ObjectId returns 400', badId.status === 400, 'status=' + badId.status);

  const notFound = await req('GET', '/data/000000000000000000000000', null, masterAToken);
  check('Not found: non-existent record returns 404', notFound.status === 404, 'status=' + notFound.status);

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('');
  console.log('=== INTEGRATION TEST RESULTS ===');
  console.log('PASSED:', pass);
  console.log('FAILED:', fail);
  console.log('TOTAL:', pass + fail);
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
