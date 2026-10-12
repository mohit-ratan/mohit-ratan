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
function freshComputeStreak({ postOffsets = [], now = new Date('2026-10-13T12:00:00Z') }) {
  const freezeRows = [];
  const fakePool = {
    query: async (sql, params) => {
      if (sql.includes('FROM posts')) return [postOffsets.map((n) => ({ created_at: daysAgo(n, now) }))];
      if (sql.includes('FROM stories')) return [[]];
      if (sql.includes('FROM streak_freeze_uses')) return [freezeRows.map((used_on) => ({ used_on }))];
      if (sql.startsWith('INSERT INTO streak_freeze_uses')) { freezeRows.push(params[1]); return [{}]; }
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
  return { computeStreak, restore };
}

test('a 2+ day gap breaks the streak entirely, even with freezes left', async () => {
  // Active today and 3 days ago, with a 2-day gap (yesterday + the day
  // before) in between — this used to bridge both gap days with freezes
  // and report a streak of 4; it must now stop at today alone.
  const { computeStreak, restore } = freshComputeStreak({ postOffsets: [0, 3] });
  try {
    const result = await computeStreak('u1');
    assert.equal(result.streak, 1);
    assert.equal(result.freezesUsedThisMonth, 0);
  } finally { restore(); }
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

test('no activity at all today or yesterday reports a broken streak', async () => {
  const { computeStreak, restore } = freshComputeStreak({ postOffsets: [3] });
  try {
    const result = await computeStreak('u1');
    assert.equal(result.streak, 0);
  } finally { restore(); }
});
