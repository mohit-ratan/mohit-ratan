const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the real controller with database fixtures, without touching user data.
test('only fully completed goals earn awards; unfinished goals and tags remain available', async () => {
  const tags = ['post-only', 'empty', 'partial', 'complete'];
  const posts = [...tags, 'complete'].map((tag, id) => ({
    id, tag, author_id: 'owner', category: 'health', created_at: '2026-09-18',
  }));
  const goals = [
    { tag: 'empty', subtasks: [] },
    { tag: 'partial', subtasks: [{ text: 'First', done: true }, { text: 'Last', done: false }] },
    { tag: 'complete', subtasks: [{ text: 'First', done: true }, { text: 'Last', done: true }] },
  ];
  const sandbox = {
    module: { exports: {} }, console,
    require: (name) => name === '../db' ? {
      query: async (sql) => [sql.includes('FROM goals') ? goals : posts],
    } : name === 'uuid' ? { v4: () => 'test-id' } : name === '../lib/goalProgress' ? require('../src/lib/goalProgress') : require(name),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/postsController.js'), 'utf8'), sandbox);
  let result;
  const res = { json: (value) => { result = JSON.parse(JSON.stringify(value)); }, status: () => res };
  const request = { query: { authorId: 'owner' }, userId: 'owner' };
  await sandbox.module.exports.achievements(request, res);
  assert.deepEqual(result.achievements.map((a) => a.tag), ['complete']);
  assert.equal(result.achievements[0].count, 2, 'multiple posts earn only one award per goal');
  assert.deepEqual(result.goals.map((a) => a.tag), ['empty', 'partial']);
  assert.deepEqual(result.tags, tags);
  goals[1].subtasks[1].done = true;
  await sandbox.module.exports.achievements(request, res);
  assert.deepEqual(result.achievements.map((a) => a.tag), ['partial', 'complete']);
  goals[2].subtasks[0].done = false;
  await sandbox.module.exports.achievements(request, res);
  assert.deepEqual(result.achievements.map((a) => a.tag), ['partial']);
});
