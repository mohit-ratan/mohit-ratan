const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { recapWindow, summarizeMonths } = require('../src/lib/monthlyRecap');

function post(id, day, extra = {}) {
  return { id, created_at: `${day}T12:00:00Z`, category: 'health', tag: 'walk', media_type: 'image', media_url: `/photos/${id}.jpg`, ...extra };
}
test('recaps appear only after the owner calendar month ends, including timezone boundaries', () => {
  const now = new Date('2026-11-01T00:00:00Z');
  assert.equal(recapWindow('Asia/Kolkata', null, now).months[0], '2026-10');
  assert.equal(recapWindow('America/New_York', null, now).months[0], '2026-09');
  assert.equal(recapWindow('UTC', '2026-05', now).months[0], '2026-04');
  const result = summarizeMonths([
    post('first', '2026-09-30', { created_at: '2026-09-30T19:00:00Z' }),
    post('next', '2026-10-31', { created_at: '2026-10-31T23:30:00Z' }),
  ], ['2026-10'], 'Asia/Kolkata');
  assert.equal(result[0].postCount, 1);
  assert.equal(result[0].images[0].id, 'first');
});
test('monthly praise uses recorded milestones and deduplicates goals and calendar days', () => {
  const rows = [
    post('1', '2026-10-01', { day_key: '2026-10-01' }),
    post('2', '2026-10-01', { day_key: '2026-10-01' }),
    post('3', '2026-10-02', { day_key: '2026-10-02', first_goal_completion: 1 }),
    post('4', '2026-10-03', { day_key: '2026-10-03', first_goal_completion: 1 }),
    post('5', '2026-10-04', { category: 'wealth', tag: 'save', media_type: 'video' }),
  ];
  const [recap] = summarizeMonths(rows, ['2026-10'], 'UTC');
  assert.equal(recap.postCount, 5);
  assert.equal(recap.activeDays, 4);
  assert.equal(recap.goalsCompleted, 1);
  assert.equal(recap.checkIns, 4);
  assert.equal(recap.bestStreak, 3);
  assert.equal(recap.images.length, 4);
  assert.ok(recap.highlights.some(text => text.includes('#walk')));
  assert.ok(recap.highlights.some(text => text.includes('3-day run')));
  assert.deepEqual(summarizeMonths(rows, ['2026-09'], 'UTC'), []);
});
test('a photo collage spans the month without duplicates; videos never become broken images', () => {
  const rows = Array.from({ length: 20 }, (_, i) => post(String(i), `2026-10-${String(i + 1).padStart(2, '0')}`));
  const [recap] = summarizeMonths(rows, ['2026-10'], 'UTC');
  assert.equal(recap.images.length, 6);
  assert.equal(new Set(recap.images.map(image => image.id)).size, 6);
  assert.equal(recap.images[0].id, '0');
  assert.equal(recap.images.at(-1).id, '19');
  const [video] = summarizeMonths([post('v', '2026-10-01', { media_type: 'video' })], ['2026-10'], 'UTC');
  assert.equal(video.images.length, 0);
  assert.equal(video.goalsCompleted, 0);
  assert.ok(video.highlights.every(text => !text.includes('finished')));
});

async function controllerFixture({ allowed = true, viewer = 'viewer', followStatus = 'none', before } = {}) {
  const now = new Date();
  const createdAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  const posts = [post('public', '2020-01-01', { created_at: createdAt, visibility: 'public' }), post('friends', '2020-01-01', { created_at: createdAt, visibility: 'friends' })];
  const queries = [];
  const pool = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (sql.includes('member_preferences')) return [[{ time_zone: 'UTC' }]];
    if (sql.includes('FROM task_checkins ci') || sql.includes('FROM special_awards')) return [[]];
    if (sql.includes('FROM posts p')) {
      assert.ok(sql.includes("p.visibility = 'public' OR ? = 1"));
      assert.ok(sql.includes('NOT EXISTS'));
      return [posts.filter(row => row.visibility === 'public' || args[1] === 1)];
    }
    return [[{ oldest: createdAt }]];
  } };
  const sandbox = { module: { exports: {} }, console, require: name => name === '../db' ? pool : name === '../lib/follows' ? { canView: async () => allowed, getFollowStatus: async () => followStatus } : name === '../lib/memberFeatures' ? { ensureMemberTables: async () => {} } : name === '../lib/taskCelebration' ? require('../src/lib/taskCelebration') : name === '../lib/monthlyRecap' ? require('../src/lib/monthlyRecap') : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/monthlyRecapController.js'), 'utf8'), sandbox);
  let response, status = 200;
  await sandbox.module.exports.list({ userId: viewer, params: { id: 'owner' }, query: before ? { before } : {} }, { status(code) { status = code; return this; }, json(data) { response = data; } });
  return { response, status, queries };
}
test('recaps respect private profiles and per-post friends visibility', async () => {
  const blocked = await controllerFixture({ allowed: false });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.queries.length, 0);
  const visitor = await controllerFixture();
  assert.equal(visitor.response.recaps[0].postCount, 1);
  assert.deepEqual(Array.from(visitor.response.recaps[0].images, image => image.id), ['public']);
  const follower = await controllerFixture({ followStatus: 'accepted' });
  assert.equal(follower.response.recaps[0].postCount, 2);
  const owner = await controllerFixture({ viewer: 'owner' });
  assert.equal(owner.response.recaps[0].postCount, 2);
});
test('malformed and future cursors cannot expose unfinished months', async () => {
  assert.equal((await controllerFixture({ before: '2026-13' })).status, 400);
  assert.equal((await controllerFixture({ before: '9998-12' })).status, 400);
});
