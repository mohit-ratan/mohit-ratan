const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dbPath = require.resolve('../src/db');

function daysAgo(n, now) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

// Builds a fresh, isolated computeStreak for each test — posts/stories are
// supplied directly as "days ago" offsets from `now`, and streak_freeze_uses
// starts empty and is captured as the test runs.
function freshComputeStreak({ postOffsets = [], existingFreezes = [], now = new Date('2026-10-13T12:00:00Z') }) {
  const freezeRows = [...existingFreezes];
  const fakePool = {
    query: async (sql, params) => {
      if (sql.includes('FROM posts')) return [postOffsets.map((n) => ({ created_at: daysAgo(n, now) }))];
      if (sql.includes('FROM stories')) return [[]];
      if (sql.includes('FROM streak_freeze_uses')) return [freezeRows.map((used_on) => ({ used_on }))];
      if (sql.startsWith('INSERT IGNORE INTO streak_freeze_uses')) { freezeRows.push(params[1]); return [{}]; }
      return [[]];
    },
  };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };
  delete require.cache[require.resolve('../src/controllers/profileController')];
  const { computeStreak } = require('../src/controllers/profileController');
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now.getTime(); }
  };
  const restore = () => { global.Date = RealDate; };
  return { computeStreak, restore, postOffsets, freezeRows };
}

test('two consecutive missed days use the two freezes and preserve the streak', async () => {
  const f = freshComputeStreak({ postOffsets: [0, 3] });
  try {
    const result = await f.computeStreak('u1');
    assert.equal(result.streak, 4);
    assert.equal(result.freezesUsedThisMonth, 2);
    assert.equal(result.freezesRemaining, 0);
  } finally { f.restore(); }
});
test('three missed days reset to zero and today starts at one', async () => {
  const f = freshComputeStreak({ postOffsets: [4, 5, 6] });
  try {
    const before = await f.computeStreak('u1');
    assert.equal(before.streak, 0);
    assert.equal(before.freezesRemaining, 0);
    f.postOffsets.push(0);
    const after = await f.computeStreak('u1');
    assert.equal(after.streak, 1);
    assert.equal((await f.computeStreak('u1')).streak, 1);
  } finally { f.restore(); }
});
test('a genuinely isolated single-day gap still bridges', async () => {
  // Active today and 2 days ago, with exactly one missed day (yesterday)
  // sandwiched between real activity on both sides — still forgiven.
  const { computeStreak, restore } = freshComputeStreak({ postOffsets: [0, 2] });
  try {
    const result = await computeStreak('u1');
    assert.equal(result.streak, 3);
    assert.equal(result.freezesUsedThisMonth, 1);
  } finally { restore(); }
});

test('two separate isolated gaps each bridge, consuming both monthly freezes', async () => {
  const { computeStreak, restore } = freshComputeStreak({ postOffsets: [0, 2, 4] });
  try {
    const result = await computeStreak('u1');
    assert.equal(result.streak, 5);
    assert.equal(result.freezesUsedThisMonth, 2);
  } finally { restore(); }
});

test('two missed days stay protected before today is posted', async () => {
  const { computeStreak, restore } = freshComputeStreak({ postOffsets: [3] });
  try {
    const result = await computeStreak('u1');
    assert.equal(result.streak, 3);
    assert.equal(result.freezesUsedThisMonth, 2);
  } finally { restore(); }
});


test('a single first post and multiple uploads on the same day both count as one', async () => {
  for (const postOffsets of [[0], [0, 0, 0]]) {
    const f = freshComputeStreak({ postOffsets });
    try { assert.equal((await f.computeStreak('u1')).streak, 1); }
    finally { f.restore(); }
  }
});
test('yesterday is protected before posting, avoiding a zero-to-six surprise', async () => {
  const f = freshComputeStreak({ postOffsets: [2, 3, 4, 5] });
  try {
    const before = await f.computeStreak('u1');
    assert.equal(before.streak, 5);
    assert.equal(before.freezesUsedThisMonth, 1);
    f.postOffsets.push(0);
    const after = await f.computeStreak('u1');
    assert.equal(after.streak, 6);
    assert.equal(after.freezesUsedThisMonth, 1);
    assert.equal(after.streak - before.streak, 1);
  } finally { f.restore(); }
});
test('repeated reads honor already-spent freezes when the monthly allowance is exhausted', async () => {
  const f = freshComputeStreak({ postOffsets: [0, 2, 4] });
  try {
    for (let read = 0; read < 3; read++) {
      const result = await f.computeStreak('u1');
      assert.equal(result.streak, 5);
      assert.equal(result.freezesUsedThisMonth, 2);
      assert.equal(result.freezesRemaining, 0);
    }
    assert.equal(f.freezeRows.length, 2);
  } finally { f.restore(); }
});
test('without a freeze available, a missed yesterday cannot revive the previous run', async () => {
  const f = freshComputeStreak({ postOffsets: [2, 3, 4, 5], existingFreezes: ['2026-10-01', '2026-10-03'] });
  // Seed real older activity so these existing uses belong to account history.
  f.postOffsets.push(14);
  try {
    assert.equal((await f.computeStreak('u1')).streak, 0);
    f.postOffsets.push(0);
    assert.equal((await f.computeStreak('u1')).streak, 1);
  } finally { f.restore(); }
});

test('freeze allowance belongs to the missed day month, not the day the badge is read', async () => {
  const f = freshComputeStreak({ postOffsets: [0, 2, 4], now: new Date('2026-11-01T12:00:00Z') });
  try {
    const result = await f.computeStreak('u1');
    assert.equal(result.streak, 5);
    assert.equal(result.freezesUsedThisMonth, 0);
    assert.equal(result.freezesRemaining, 2);
    assert.equal((await f.computeStreak('u1')).streak, 5);
  } finally { f.restore(); }
});

test('November allowance cannot cover October after both October freezes were spent', async () => {
  const f = freshComputeStreak({
    now: new Date('2026-11-01T12:00:00Z'),
    postOffsets: [0, 2, 3, 4, 5],
    existingFreezes: ['2026-10-05', '2026-10-15'],
  });
  try {
    // Earlier activity may have been deleted; its freeze spending still counts.
    const result = await f.computeStreak('u1');
    assert.equal(result.streak, 1);
    assert.equal(result.freezesRemaining, 2);
    assert.equal(f.freezeRows.length, 2);
    assert.equal((await f.computeStreak('u1')).streak, 1);
  } finally { f.restore(); }
});
test('extra October freeze claims saved by older code cannot keep the old streak alive', async () => {
  const f = freshComputeStreak({
    now: new Date('2026-11-01T12:00:00Z'),
    postOffsets: [0, 2, 3, 4, 5, 31],
    existingFreezes: ['2026-10-05', '2026-10-15', '2026-10-31'],
  });
  try {
    const result = await f.computeStreak('u1');
    assert.equal(result.streak, 1);
    assert.equal(result.freezesRemaining, 2);
    assert.equal(f.freezeRows.length, 3, 'legacy rows are ignored, not destructively removed');
  } finally { f.restore(); }
});
test('removing old activity does not refund already-spent freezes in the current month', async () => {
  const f = freshComputeStreak({ postOffsets: [0], existingFreezes: ['2026-10-01', '2026-10-03'] });
  try {
    const result = await f.computeStreak('u1');
    assert.equal(result.streak, 1);
    assert.equal(result.freezesUsedThisMonth, 2);
    assert.equal(result.freezesRemaining, 0);
  } finally { f.restore(); }
});
