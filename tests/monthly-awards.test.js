const { test } = require('node:test');
const assert = require('node:assert/strict');
const { awardsForMonth } = require('../src/lib/monthlyAwards');
const { summarizeMonths } = require('../src/lib/monthlyRecap');
const event = (day, extra = {}) => ({ tag: 'walk', category: 'health', day_key: day, occurred_ms: Date.parse(`${day}T12:00:00Z`), ...extra });

test('monthly goal awards preserve the completion photo target and do not duplicate a goal', () => {
  const posts = [
    { tag: 'walk', category: 'health', first_goal_completion: 1, goal_target: 20 },
    { tag: 'walk', category: 'health', first_goal_completion: 1, goal_target: 20 },
    { tag: 'save', category: 'wealth', first_goal_completion: 0, goal_target: 30 },
  ];
  const awards = awardsForMonth(posts, [], [], '2026-10', 'UTC');
  assert.equal(awards.length, 1);
  assert.equal(awards[0].targetDays, 20);
  assert.equal(awards[0].category, 'health');
});
test('a streak spanning months earns its full 20-day award, without repeating older completed runs', () => {
  const history = Array.from({ length: 20 }, (_, i) => event(new Date(Date.UTC(2026, 8, 25 + i)).toISOString().slice(0, 10)));
  const october = awardsForMonth([], history, [], '2026-10', 'UTC');
  assert.equal(october.length, 1);
  assert.equal(october[0].kind, 'streak');
  assert.equal(october[0].days, 20);
  assert.equal(awardsForMonth([], history, [], '2026-09', 'UTC').length, 0);
  assert.equal(awardsForMonth([], history, [], '2026-11', 'UTC').length, 0);
});
test('future streak days never inflate an earlier month award', () => {
  const history = Array.from({ length: 20 }, (_, i) => event(new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10)));
  const awards = awardsForMonth([], history, [], '2026-10', 'UTC');
  assert.equal(awards[0].days, 12);
  assert.equal(awardsForMonth([], history.slice(0, 6), [], '2026-10', 'UTC').length, 0);
});
test('Trifecta is dated to its actual earning month and public recaps require visible qualifying activity', () => {
  const special = [{ earned_at: '2026-10-20T12:00:00Z' }];
  assert.equal(awardsForMonth([], [], special, '2026-10', 'UTC').length, 0);
  assert.equal(awardsForMonth([], [], special, '2026-10', 'UTC', true)[0].kind, 'trifecta');
  assert.equal(awardsForMonth([], [], special, '2026-11', 'UTC', true).length, 0);
  const visible = ['health', 'wealth', 'relationships'].map(category => event('2026-10-19', { tag: category, category, goal_completed: 1 }));
  assert.ok(awardsForMonth([], visible, special, '2026-10', 'UTC').some(award => award.kind === 'trifecta'));
});
test('profile recaps expose award artwork metadata and positive award highlights', () => {
  const [recap] = summarizeMonths([{ id: 'p', tag: 'walk', category: 'health', created_at: '2026-10-20T12:00:00Z', media_type: 'image', first_goal_completion: 1, goal_target: 20 }], ['2026-10'], 'UTC');
  assert.equal(recap.awardCount, 1);
  assert.equal(recap.awards[0].targetDays, 20);
  assert.ok(recap.highlights.some(text => text.includes('earned 1 award')));
});
