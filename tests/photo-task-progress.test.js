const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture({ done = false, missing = false, fail = false, targetDays = 1, initialDays = 0, legacyPhotos = [], canView = true } = {}) {
  const events = [];
  const snapshots = new Map();
  let photoSequence = 0;
  const photos = new Set(legacyPhotos);
  let tasks = [{ text: 'Run', done, targetDays, completedDays: done ? targetDays : initialDays }];
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
      if (sql.startsWith('INSERT IGNORE INTO post_goal_progress')) {
        for (const id of photos) if (!snapshots.has(id)) snapshots.set(id, { completed: args[0], target: args[1] });
        return [{}];
      }
      if (sql.startsWith('INSERT INTO post_goal_progress')) {
        snapshots.set(args[0], { completed: args[1], target: args[2] });
        return [{}];
      }
      if (sql.startsWith('INSERT INTO posts')) { events.push('post'); if (fail) throw new Error('write failed'); photos.add(args[0]); }
      if (sql.startsWith('UPDATE')) { tasks = JSON.parse(args[0]); events.push('task'); }
      return [{}];
    },
  };
  const sandbox = { module: { exports: {} }, console: { error() {} }, require: (name) => name === '../lib/trifecta' ? { checkAndAwardTrifecta: async () => false, trifectaStatus: async () => ({}), TRIFECTA_CATEGORIES: ['health','wealth','relationships'] } : name === '../lib/memberFeatures' ? { ensureMemberTables: async () => {}, recordCheckIn: async () => {} } : name === '../lib/taskCelebration' ? require('../src/lib/taskCelebration') : name === '../lib/access' ? { canViewPost: async () => canView } : name === '../db' ? { getConnection: async () => connection, query: async (sql, args) => {
    if (sql.includes('FROM post_goal_progress')) return [[...snapshots].map(([post_id, progress]) => ({ post_id, ...progress }))];
    if (sql.includes('FROM posts p')) return [[...photos].filter(id => !sql.includes('WHERE p.id = ?') || id === args[2]).map(id => ({ id, author_id: 'owner', tag: 'fitness', created_at: new Date() }))];
    throw new Error(`Unexpected pool query: ${sql}`);
  } } : name === 'uuid' ? { v4: () => `photo-${++photoSequence}` } : name === '../lib/goalProgress' ? require('../src/lib/goalProgress') : name === '../lib/follows' ? { canView: async () => true } : name === '../lib/notifications' ? { notify: async () => {} } : name === '../lib/storage' ? { uploadMedia: async () => '/assets/uploads/small.jpg', deleteMedia: async () => {} } : name === '../lib/reactions' ? require('../src/lib/reactions') : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/postsController.js'), 'utf8'), sandbox);
  const req = { userId: 'owner', file: { filename: 'photo.jpg', mimetype: 'image/jpeg' }, body: { category: 'health', tag: 'fitness', goalTaskIndex: '0', goalTaskText: 'Run' } };
  const response = { status: 200 };
  const res = { status(code) { response.status = code; return this; }, json(data) { response.data = data; } };
  return { run: () => sandbox.module.exports.create(req, res), runGet: id => sandbox.module.exports.get({ userId: 'owner', params: { id } }, res), runList: () => sandbox.module.exports.list({ userId: 'owner', query: {} }, res), req, response, events, snapshots };
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


test('a new photo saves 11 task days while the previous photo keeps 10', async () => {
  const f = fixture({ targetDays: 20 });
  for (let day = 1; day <= 10; day++) await f.run();
  const yesterdayId = f.response.data.id;
  assert.deepEqual(f.snapshots.get(yesterdayId), { completed: 10, target: 20 });
  await f.run();
  assert.deepEqual(f.snapshots.get(f.response.data.id), { completed: 11, target: 20 });
  assert.deepEqual(f.snapshots.get(yesterdayId), { completed: 10, target: 20 });
  const todayId = f.response.data.id;
  await f.runList();
  assert.equal(f.response.data.posts.find(post => post.id === yesterdayId).goalProgress.completed, 10);
  assert.equal(f.response.data.posts.find(post => post.id === todayId).goalProgress.completed, 11);
});

test('legacy photos get the pre-upload total before the next photo advances it', async () => {
  const f = fixture({ targetDays: 20, initialDays: 10, legacyPhotos: ['yesterday'] });
  await f.run();
  assert.equal(f.response.status, 200);
  assert.deepEqual(f.snapshots.get('yesterday'), { completed: 10, target: 20 });
  assert.deepEqual(f.snapshots.get(f.response.data.id), { completed: 11, target: 20 });
});

test('notification post lookup returns the specific photo and its saved progress', async () => {
  const f = fixture({ targetDays: 20 });
  await f.run();
  const firstId = f.response.data.id;
  await f.run();
  await f.runGet(firstId);
  assert.equal(f.response.status, 200);
  assert.equal(f.response.data.post.id, firstId);
  assert.equal(f.response.data.post.goalProgress.completed, 1);
});

test('notification post lookup handles deleted and inaccessible posts', async () => {
  const missing = fixture();
  await missing.runGet('deleted');
  assert.equal(missing.response.status, 404);
  const hidden = fixture({ canView: false });
  await hidden.run();
  await hidden.runGet(hidden.response.data.id);
  assert.equal(hidden.response.status, 404);
});
