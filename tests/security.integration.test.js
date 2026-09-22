const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');

// Explicit opt-in only. Uses a newly created scratch DB, never .env or production.
test('security and recovery against isolated local MySQL', { skip: process.env.PSW_TEST_MYSQL !== '1' }, async t => {
  const mysql = require('mysql2/promise');
  const config = { socketPath: '/tmp/mysql.sock', user: 'root', multipleStatements: true };
  const admin = await mysql.createConnection(config);
  const name = `psw_test_${crypto.randomBytes(8).toString('hex')}`;
  let pool;
  try {
    await admin.query(`CREATE DATABASE \`${name}\``);
    pool = mysql.createPool({ ...config, database: name, connectionLimit: 8 });
    await pool.query(fs.readFileSync('schema.sql', 'utf8'));
    const env = { JWT_SECRET: crypto.randomBytes(32).toString('hex'), APP_URL: 'https://example.test', NODE_ENV: 'test' };
    const cache = new Map();
    const mail = [];
    let failMail = false;
    function load(relative) {
      const filename = path.resolve(relative);
      if (cache.has(filename)) return cache.get(filename).exports;
      const module = { exports: {} }; cache.set(filename, module);
      const nativeRequire = createRequire(filename);
      const sandbox = { module, exports: module.exports, Buffer, URL, Date, process: { env }, console: { log() {}, info() {}, warn() {}, error() {} }, require(spec) {
        if (spec === '../db' || spec === './db') return pool;
        if (spec === '../utils/mailer') return { sendMail: async message => { if (failMail) throw new Error('test failure'); mail.push(message); return { messageId: 'test-id' }; } };
        if (spec === '../lib/storage') return { uploadMedia: async () => 'test-url', deleteMedia: async () => {} };
        if (spec === '../lib/notifications') return { notify: async () => {} };
        if (spec.startsWith('.')) return load(path.resolve(path.dirname(filename), `${spec}.js`));
        return nativeRequire(spec);
      } };
      vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
      return module.exports;
    }
    const auth = load('src/controllers/authController.js');
    const security = load('src/lib/authSecurity.js');
    const goals = load('src/controllers/goalsController.js');
    const posts = load('src/controllers/postsController.js');
    const { canViewPost } = load('src/lib/access.js');
    const { requireAuth } = load('src/middleware/auth.js');
    const account = load('src/controllers/accountController.js');
    await security.ensureSecurityTables();
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('test-password', 4);
    for (const id of ['owner', 'follower', 'stranger', 'blocked']) await pool.query('INSERT INTO users (id,email,password_hash,display_name,email_verified) VALUES (?,?,?,?,1)', [id, `${id}@example.test`, passwordHash, id]);
    await pool.query("INSERT INTO follows (follower_id,followee_id,status) VALUES ('follower','owner','accepted'),('blocked','owner','accepted')");
    await pool.query("INSERT INTO blocks (blocker_id,blocked_id) VALUES ('owner','blocked')");
    await pool.query("INSERT INTO posts (id,author_id,category,media_url,media_type,visibility) VALUES ('private','owner','health','https://example.test/photo','image','friends'), ('public','owner','health','https://example.test/photo2','image','public')");
    await pool.query("INSERT INTO goals (id,author_id,tag,subtasks) VALUES ('goal','owner','walk',?)", [JSON.stringify([{ id: 'task', text: 'Walk', targetDays: 7, completedDays: 2 }])]);
    function response() { return { statusCode: 200, headers: {}, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; }, set(k,v) { this.headers[k] = v; return this; } }; }
    async function call(fn, body = {}, extra = {}) { const res = response(); await fn({ body, query: {}, params: {}, ...extra }, res); return res; }
    await t.test('owner/follower/stranger/blocked visibility matrix and direct endpoint denial', async () => {
      for (const [viewer, allowed] of [['owner',true],['follower',true],['stranger',false],['blocked',false]]) {
        assert.equal(await canViewPost(viewer, 'private'), allowed);
        const goal = await call(goals.get, {}, { userId: viewer, query: { authorId: 'owner' }, params: { tag: 'walk' } });
        assert.equal(goal.statusCode, allowed ? 200 : 404);
        for (const fn of [posts.listComments, posts.like, posts.addComment]) {
          const res = await call(fn, { text: 'test' }, { userId: viewer, params: { id: 'private' } });
          assert.equal(res.statusCode, allowed ? 200 : 404);
        }
      }
      assert.equal(await canViewPost('stranger', 'public'), true);
      assert.equal(await canViewPost('blocked', 'public'), false);
      assert.equal(await canViewPost('owner', 'missing'), false);
      await pool.query("UPDATE users SET is_private=0 WHERE id='owner'");
      assert.equal(await canViewPost('stranger','private'),false, 'Friends-only posts stay restricted on public profiles');
      await pool.query("UPDATE users SET is_private=1 WHERE id='owner'");
    });
    await t.test('OTP is hashed, locks after five failures, expires, and is consumed once concurrently', async () => {
      assert.equal((await call(auth.requestOtp, { email: 'owner@example.test' })).statusCode, 200);
      const code = mail.at(-1).html.match(/>(\d{6})</)[1];
      const [[stored]] = await pool.query("SELECT otp_hash FROM auth_security WHERE user_id='owner'");
      assert.notEqual(stored.otp_hash, code);
      for (let i=0;i<5;i++) assert.equal((await call(auth.verifyOtp, { email:'owner@example.test',code:'wrong' })).statusCode,401);
      assert.equal((await call(auth.verifyOtp, { email:'owner@example.test',code })).statusCode,401);
      await call(auth.requestOtp, {email:'owner@example.test'});
      const fresh = mail.at(-1).html.match(/>(\d{6})</)[1];
      const results = await Promise.all([call(auth.verifyOtp,{email:'owner@example.test',code:fresh}),call(auth.verifyOtp,{email:'owner@example.test',code:fresh})]);
      assert.deepEqual(results.map(r=>r.statusCode).sort(), [200,401]);
      await call(auth.requestOtp, {email:'owner@example.test'});
      const expired = mail.at(-1).html.match(/>(\d{6})</)[1];
      await pool.query("UPDATE auth_security SET otp_expires=NOW()-INTERVAL 1 MINUTE WHERE user_id='owner'");
      assert.equal((await call(auth.verifyOtp,{email:'owner@example.test',code:expired})).statusCode,401);
    });
    await t.test('persistent limiter permits only its budget under concurrent requests', async () => {
      const results = await Promise.all(Array.from({length:8},()=>security.consumeLimit('test',3,600)));
      assert.equal(results.filter(Boolean).length,3);
      assert.equal(await security.consumeLimit('test',3,600),false);
      const limiter = security.rateLimit('route-test', 1, 60);
      const req = { body: { email: 'test@example.test' }, ip: '127.0.0.1' };
      let accepted = 0;
      await limiter(req, response(), () => accepted++);
      const denied = response();
      await limiter(req, denied, () => accepted++);
      assert.equal(accepted, 1); assert.equal(denied.statusCode, 429);
      assert.equal(denied.headers['Retry-After'], '60');
    });
    await t.test('password reset is single-use and revokes previous sessions', async () => {
      const login = await call(auth.login, {email:'owner@example.test',password:'test-password'});
      assert.equal(login.statusCode,200);
      await call(auth.forgotPassword,{email:'owner@example.test'});
      const expiredToken = mail.at(-1).html.match(/token=([a-f0-9]{64})/)[1];
      await pool.query("UPDATE auth_security SET reset_expires=NOW()-INTERVAL 1 MINUTE WHERE user_id='owner'");
      assert.equal((await call(auth.resetPassword,{token:expiredToken,password:'new-password'})).statusCode,400);
      await call(auth.forgotPassword,{email:'owner@example.test'});
      const token = mail.at(-1).html.match(/token=([a-f0-9]{64})/)[1];
      const results = await Promise.all([call(auth.resetPassword,{token,password:'new-password'}),call(auth.resetPassword,{token,password:'new-password'})]);
      assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,400]);
      const res = response(); let next = false;
      await requireAuth({ headers: {authorization:`Bearer ${login.body.token}`} },res,()=>{next=true;});
      assert.equal(next,false); assert.equal(res.statusCode,401);
      assert.equal((await call(auth.login,{email:'owner@example.test',password:'new-password'})).statusCode,200);
      assert.equal((await call(auth.login,{email:'owner@example.test',password:'test-password'})).statusCode,401);
    });
    await t.test('registration send failure is reported, and verification can be resent once', async () => {
      failMail=true;
      const result=await call(auth.register,{email:'new@example.test',password:'new-password',displayName:'New'});
      assert.equal(result.body.emailSent,false);
      failMail=false;
      assert.equal((await call(auth.resendVerification,{email:'new@example.test'})).statusCode,200);
      const token=mail.at(-1).html.match(/token=([a-f0-9]{64})/)[1];
      assert.equal((await call(auth.verify,{}, {query:{token}})).statusCode,200);
      assert.equal((await call(auth.verify,{}, {query:{token}})).statusCode,400);
    });
    await t.test('reports persist and deletion requires reauthentication then cascades data', async () => {
      const login = await call(auth.login,{email:'owner@example.test',password:'new-password'});
      const report = await call(account.report,{kind:'help',message:'Please help with my goal.'},{userId:'owner'});
      assert.equal(report.statusCode,200);
      assert.equal((await call(account.deleteAccount,{password:'wrong',confirmation:'DELETE'},{userId:'owner'})).statusCode,401);
      assert.equal((await call(account.deleteAccount,{password:'new-password',confirmation:'DELETE'},{userId:'owner'})).statusCode,200);
      const [[row]] = await pool.query("SELECT COUNT(*) n FROM posts WHERE author_id='owner'");
      assert.equal(row.n,0);
      const denied = response();
      await requireAuth({ headers: { authorization: `Bearer ${login.body.token}` } }, denied, () => assert.fail('Deleted account session accepted'));
      assert.equal(denied.statusCode,401);
      await account.drainMediaDeletionQueue();
    });
  } finally {
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
  }
});
