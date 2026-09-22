const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { normalizeTasks } = require('../src/lib/goalProgress');

test('legacy goals retain completion; progress is weighted by required task days', async () => {
  const { tasksProgress } = await import('../client/src/lib/format.js');
  assert.deepEqual(normalizeTasks([{ text: 'Old', done: true }])[0], { id: 'legacy-0', text: 'Old', done: true, targetDays: 1, completedDays: 1 });
  assert.deepEqual(tasksProgress([{ targetDays: 10, completedDays: 1 }, { targetDays: 20, completedDays: 2 }]), { target: 30, completed: 3 });
});

test('editing duration preserves server progress, rejects forged counts and gives new tasks zero progress', async () => {
  let saved;
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql, args) => {
      if (sql.startsWith('SELECT')) return [[{ id: 'goal', subtasks: [{ id: 'task', text: 'Run', targetDays: 3, completedDays: 2, done: false }] }]];
      saved = JSON.parse(args[1]); return [{}];
    },
  };
  const sandbox = { module: { exports: {} }, console, require: (name) => name === '../lib/follows' ? { canView: async () => true } : name === '../db' ? { query: async () => [[{ found: 1 }]], getConnection: async () => connection } : name === 'uuid' ? { v4: () => 'new-task' } : name === '../lib/goalProgress' ? require('../src/lib/goalProgress') : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/goalsController.js'), 'utf8'), sandbox);
  const req = { userId: 'owner', params: { tag: 'fitness' }, body: { subtasks: [{ id: 'task', text: 'Run', targetDays: 10, completedDays: 10, done: true }, { text: 'Walk', targetDays: 5, completedDays: 5, done: true }] } };
  const res = { json() {}, status() { return this; } };
  await sandbox.module.exports.upsert(req, res);
  assert.equal(saved[0].completedDays, 2);
  assert.equal(saved[0].targetDays, 10);
  assert.equal(saved[0].done, false);
  assert.equal(saved[1].completedDays, 0);
  assert.equal(saved[1].done, false);
});
