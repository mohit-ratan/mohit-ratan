const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function readGoal(rows) {
  let response;
  const sandbox = { module: { exports: {} }, console, require: (name) => name === '../lib/follows' ? { canView: async () => true } : name === '../db' ? { query: async (sql, args) => {
    assert.deepEqual(Array.from(args), ['post-author', 'fitness']);
    return [rows];
  } } : name === 'uuid' ? { v4: () => 'id' } : name === '../lib/goalProgress' ? require('../src/lib/goalProgress') : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/goalsController.js'), 'utf8'), sandbox);
  await sandbox.module.exports.get({ userId: 'viewer', query: { authorId: 'post-author' }, params: { tag: 'fitness' } }, { json(value) { response = JSON.parse(JSON.stringify(value)); }, status() { return this; } });
  return response;
}

test('post goal lookup uses the post author and returns partial task progress', async () => {
  const result = await readGoal([{ target_date: '2026-09-30', subtasks: [{ id: 'task', text: 'Walk', targetDays: 10, completedDays: 3 }] }]);
  assert.equal(result.goal.targetDate, '2026-09-30');
  assert.equal(result.goal.completed, false);
  assert.equal(result.goal.subtasks[0].completedDays, 3);
  assert.equal(result.goal.subtasks[0].targetDays, 10);
});
test('posts with no linked goal do not show a fabricated checklist', async () => {
  assert.deepEqual(await readGoal([]), { goal: null });
});
