const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture({ posts = ['2026-10-15T12:00:00Z'], zone = 'UTC' } = {}) {
  const saved = new Set();
  const pool = { query: async (sql, args) => {
    if (sql.includes('FROM member_preferences')) return [[{ time_zone: zone }]];
    if (sql.startsWith('SELECT 1 FROM monthly_recap_notifications')) return [saved.has(args.join(':')) ? [{ found: 1 }] : []];
    if (sql.includes('FROM posts')) return [posts.filter(value => new Date(value) >= args[1] && new Date(value) < args[2]).map(created_at => ({ created_at }))];
    if (sql.startsWith('INSERT IGNORE')) {
      const key = args.join(':');
      const affectedRows = saved.has(key) ? 0 : 1;
      saved.add(key);
      return [{ affectedRows }];
    }
    throw Error(`Unexpected query: ${sql}`);
  } };
  const sandbox = { module: { exports: {} }, console, require: name => name === '../db' ? pool : name === './memberFeatures' ? { ensureMemberTables: async () => {} } : name === './taskCelebration' ? require('../src/lib/taskCelebration') : name === './monthlyRecap' ? require('../src/lib/monthlyRecap') : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/monthlyRecapNotifications.js'), 'utf8'), sandbox);
  return { ensure: sandbox.module.exports.ensureMonthlyRecapNotification, saved };
}
test('month beginning creates one notification for last month, including concurrent inbox polls', async () => {
  const f = fixture();
  const now = new Date('2026-11-01T00:01:00Z');
  const results = await Promise.all([f.ensure('owner', now), f.ensure('owner', now), f.ensure('owner', now)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual([...f.saved], ['owner:2026-10']);
  assert.equal(await f.ensure('owner', new Date('2026-11-06T00:00:00Z')), false);
});
test('saved timezone controls month rollover and empty recaps do not notify', async () => {
  const india = fixture({ zone: 'Asia/Kolkata' });
  assert.equal(await india.ensure('owner', new Date('2026-10-31T18:31:00Z')), true);
  assert.ok(india.saved.has('owner:2026-10'));
  const utc = fixture();
  assert.equal(await utc.ensure('owner', new Date('2026-10-31T18:31:00Z')), false);
  const boundaryOnly = fixture({ zone: 'Asia/Kolkata', posts: ['2026-10-31T23:30:00Z'] });
  assert.equal(await boundaryOnly.ensure('owner', new Date('2026-11-01T00:00:00Z')), false);
});
test('a delayed startup catches up and year rollover uses December', async () => {
  const f = fixture({ posts: ['2026-12-15T12:00:00Z'] });
  assert.equal(await f.ensure('owner', new Date('2027-01-05T12:00:00Z')), true);
  assert.ok(f.saved.has('owner:2026-12'));
});
test('inbox merges recap notices and marks them read only for the signed-in recipient', async () => {
  const updates = [];
  const pool = { query: async (sql, args) => {
    if (sql.startsWith('UPDATE')) { updates.push({ sql, args: Array.from(args) }); return [{}]; }
    assert.deepEqual(Array.from(args), ['owner']);
    if (sql.includes('FROM monthly_recap_notifications')) return [[{ month_key: '2026-10', created_at: '2026-11-01T00:00:00Z', read_at: null }]];
    return [[{ id: 'like', type: 'like', post_id: 'photo', actor_id: 'friend', created_at: '2026-10-30T00:00:00Z', read_at: null }]];
  } };
  const sandbox = { module: { exports: {} }, console, require: name => name === '../db' ? pool : name === '../lib/monthlyRecapNotifications' ? { ensureMonthlyRecapNotification: async () => false } : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/notificationsController.js'), 'utf8'), sandbox);
  let result;
  const res = { json(value) { result = value; }, status() { return this; } };
  await sandbox.module.exports.list({ userId: 'owner' }, res);
  assert.equal(result.notifications[0].type, 'monthly_recap');
  assert.equal(result.notifications[0].ownerId, 'owner');
  assert.equal(result.notifications[0].month, '2026-10');
  assert.equal(result.notifications[1].postId, 'photo');
  await sandbox.module.exports.markRead({ userId: 'owner' }, res);
  assert.equal(updates.length, 2);
  assert.ok(updates.every(update => update.args[0] === 'owner'));
});
