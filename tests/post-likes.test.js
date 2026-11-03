const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(allowed, rows = []) {
  const calls = [];
  const sandbox = { module: { exports: {} }, console, require(name) {
    if (name === '../lib/reactions') return require('../src/lib/reactions');
    if (name === '../lib/access') return { canViewPost: async () => allowed };
    if (name === '../db') return { query: async (sql, params) => { calls.push({ sql, params }); return [rows]; } };
    return {};
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/postsController.js'), 'utf8'), sandbox);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = JSON.parse(JSON.stringify(body)); } };
  return { handler: sandbox.module.exports.listLikes, calls, res };
}

test('likes are unavailable when viewer cannot access the post', async () => {
  const { handler, calls, res } = fixture(false);
  await handler({ userId: 'viewer', params: { id: 'private' }, query: {} }, res);
  assert.equal(res.code, 404);
  assert.equal(calls.length, 0);
});

test('likes return profile summaries with pagination and mutual block filtering', async () => {
  const rows = Array.from({ length: 51 }, (_, i) => ({ id: String(i), display_name: `Member ${i}`, photo_url: null }));
  const { handler, calls, res } = fixture(true, rows);
  await handler({ userId: 'viewer', params: { id: 'post' }, query: { offset: '50' } }, res);
  assert.equal(res.body.users.length, 50);
  assert.equal(res.body.hasMore, true);
  assert.deepEqual(res.body.users[0], { id: '0', displayName: 'Member 0', photoUrl: null, followStatus: 'none' });
  assert.deepEqual(Array.from(calls[0].params), ['viewer', 'post', 'viewer', 'viewer', 50]);
  assert.match(calls[0].sql, /b.blocker_id = \? AND b.blocked_id = u.id/);
  assert.match(calls[0].sql, /b.blocked_id = \? AND b.blocker_id = u.id/);
});

test('an empty list has no next page and negative offsets are clamped', async () => {
  const { handler, calls, res } = fixture(true);
  await handler({ userId: 'viewer', params: { id: 'post' }, query: { offset: '-5' } }, res);
  assert.deepEqual(res.body, { users: [], hasMore: false });
  assert.equal(calls[0].params[4], 0);
});


test('comment people lists deduplicate commenters and include follow status', async () => {
  const { handler, calls, res } = fixture(true, [{ id: 'friend', display_name: 'Friend', photo_url: null, follow_status: 'accepted' }, { id: 'viewer', display_name: 'Me', photo_url: null }]);
  await handler({ userId: 'viewer', params: { id: 'post', kind: 'comments' }, query: {} }, res);
  assert.match(calls[0].sql, /SELECT DISTINCT/);
  assert.match(calls[0].sql, /FROM comments activity/);
  assert.equal(res.body.users[0].followStatus, 'accepted');
  assert.equal(res.body.users[1].followStatus, 'me');
});

test('cheer lists filter by selected cheer and reject unsupported kinds', async () => {
  const { handler, calls, res } = fixture(true);
  await handler({ userId: 'viewer', params: { id: 'post', kind: 'cheers' }, query: { reaction: '🔥' } }, res);
  assert.match(calls[0].sql, /activity.reaction = \?/);
  assert.equal(calls[0].params[4], '🔥');
  await handler({ userId: 'viewer', params: { id: 'post', kind: 'other' }, query: {} }, res);
  assert.equal(res.code, 400);
});
