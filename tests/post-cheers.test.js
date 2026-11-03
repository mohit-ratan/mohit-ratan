const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(allowed = true) {
  let current = null;
  const sandbox = { module: { exports: {} }, console, require(name) {
    if (name === '../lib/reactions') return require('../src/lib/reactions');
    if (name === '../lib/access') return { canViewPost: async () => allowed };
    if (name === '../lib/notifications') return { notify: async () => {} };
    if (name === '../db') return { query: async (sql, params) => {
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
