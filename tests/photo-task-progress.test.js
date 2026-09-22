const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture({ done = false, missing = false, fail = false, targetDays = 1 } = {}) {
  const events = [];
  let tasks = [{ text: 'Run', done, targetDays, completedDays: done ? targetDays : 0 }];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    query: async (sql, args) => {
      if (sql.startsWith('SELECT')) {
        assert.deepEqual(Array.from(args), ['owner', 'fitness']);
        return [missing ? [] : [{ id: 'goal', subtasks: tasks }]];
      }
      if (sql.startsWith('INSERT')) { events.push('post'); if (fail) throw new Error('write failed'); }
      if (sql.startsWith('UPDATE')) { tasks = JSON.parse(args[0]); events.push('task'); }
      return [{}];
    },
  };
  const sandbox = { module: { exports: {} }, console: { error() {} }, require: (name) => name === '../lib/taskCelebration' ? require('../src/lib/taskCelebration') : name === '../lib/access' ? { canViewPost: async () => true } : name === '../db' ? { getConnection: async () => connection } : name === 'uuid' ? { v4: () => 'photo-id' } : name === '../lib/goalProgress' ? require('../src/lib/goalProgress') : name === '../lib/follows' ? { canView: async () => true } : name === '../lib/notifications' ? { notify: async () => {} } : name === '../lib/storage' ? { uploadMedia: async () => '/assets/uploads/small.jpg', deleteMedia: async () => {} } : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/postsController.js'), 'utf8'), sandbox);
  const req = { userId: 'owner', file: { filename: 'photo.jpg', mimetype: 'image/jpeg' }, body: { category: 'health', tag: 'fitness', goalTaskIndex: '0', goalTaskText: 'Run' } };
  const response = { status: 200 };
  const res = { status(code) { response.status = code; return this; }, json(data) { response.data = data; } };
  return { run: () => sandbox.module.exports.create(req, res), req, response, events };
}

test('photo completes its selected task and final task earns an award atomically', async () => {
  const f = fixture(); await f.run();
  assert.equal(f.response.data.taskCompleted, true);
  assert.equal(f.response.data.goalCompleted, true);
  assert.deepEqual(f.events, ['begin', 'post', 'task', 'commit', 'release']);
});
test('another photo for a completed task does not count a second completion', async () => {
  const f = fixture({ done: true }); await f.run();
  assert.equal(f.response.data.taskCompleted, false);
  assert.equal(f.response.data.celebration, null);
});
test('missing or changed tasks cannot be completed', async () => {
  for (const options of [{ missing: true }, {}]) {
    const f = fixture(options); f.req.body.goalTaskText = 'Different task'; await f.run();
    assert.equal(f.response.status, 409);
    assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
  }
});
test('failed post rolls back without completing task', async () => {
  const f = fixture({ fail: true }); await f.run();
  assert.equal(f.response.status, 500);
  assert.deepEqual(f.events, ['begin', 'post', 'rollback', 'release']);
});
test('video and malformed task selection are rejected', async () => {
  const video = fixture(); video.req.file.mimetype = 'video/mp4'; await video.run();
  assert.equal(video.response.status, 400);
  const invalid = fixture(); invalid.req.body.goalTaskIndex = '-1'; await invalid.run();
  assert.equal(invalid.response.status, 400);
});

test('each upload adds one day, completion requires target and is capped', async () => {
  const f = fixture({ targetDays: 3 });
  await f.run();
  assert.equal(f.response.data.completedDays, 1);
  assert.equal(f.response.data.celebration.day, 1);
  assert.equal(f.response.data.celebration.streakDays, 1);
  assert.equal(f.response.data.goalCompleted, false);
  assert.equal(f.response.data.taskCompleted, false);
  await f.run();
  assert.equal(f.response.data.completedDays, 2);
  assert.equal(f.response.data.celebration.day, 2);
  assert.equal(f.response.data.celebration.streakDays, 1);
  assert.equal(f.response.data.goalCompleted, false);
  await f.run();
  assert.equal(f.response.data.completedDays, 3);
  assert.equal(f.response.data.taskCompleted, true);
  assert.equal(f.response.data.goalCompleted, true);
  await f.run();
  assert.equal(f.response.data.completedDays, 3);
  assert.equal(f.response.data.taskCompleted, false);
});
