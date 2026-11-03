const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(allowed = true) {
  let current = null;
  const sandbox = { module: { exports: {} }, console, require(name) {
    if (name === '../lib/postCheers') return require('../src/lib/postCheers');
    if (name === '../lib/reactions') return require('../src/lib/reactions');
    if (name === '../lib/access') return { canViewPost: async () => allowed };
    if (name === '../lib/notifications') return { notify: async () => {} };
    if (name === '../db') return { query: async (sql, params) => {
      if (sql.includes('GROUP BY post_id')) return [current ? [{ post_id: 'post', reaction: current, count: 1 }] : []];
      if (sql.includes('SELECT reaction')) return [current ? [{ reaction: current }] : []];
      if (sql.startsWith('INSERT INTO post_reactions')) current = params[2];
      else if (sql.startsWith('DELETE FROM post_reactions')) current = null;
      return [[]];
    } };
    return {};
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/postsController.js'), 'utf8'), sandbox);
  return async reaction => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await sandbox.module.exports.setPostReaction({ userId: 'member', params: { id: 'post' }, body: { reaction } }, res);
    return res;
  };
}
test('cheers can be added, replaced and removed without affecting likes', async () => {
  const pick = fixture();
  assert.equal((await pick('💪')).body.myReaction, '💪');
  assert.equal((await pick('🙌')).body.myReaction, '🙌');
  assert.equal((await pick('🎯')).body.myReaction, '🎯');
  assert.equal((await pick('🎯')).body.myReaction, null);
});
test('cheers require access and a recognized value', async () => {
  assert.equal((await fixture(false)('💪')).code, 404);
  assert.equal((await fixture()('anything')).code, 400);
});


test('shared counts combine members by cheer and sort most used first', async () => {
  const { cheerCounts } = require('../src/lib/postCheers');
  let params;
  const db = { query: async (sql, values) => {
    params = values;
    return [[{ post_id: 'p1', reaction: '🔥', count: '3' }, { post_id: 'p1', reaction: '👏', count: '5' }, { post_id: 'p2', reaction: '💪', count: '1' }]];
  } };
  const counts = await cheerCounts(db, ['p1', 'p2', 'p3']);
  assert.deepEqual(counts.get('p1'), [{ reaction: '👏', count: 5 }, { reaction: '🔥', count: 3 }]);
  assert.deepEqual(counts.get('p2'), [{ reaction: '💪', count: 1 }]);
  assert.deepEqual(counts.get('p3'), []);
  assert.deepEqual(params.slice(0, 3), ['p1', 'p2', 'p3']);
});
