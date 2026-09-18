const { test } = require('node:test');
const assert = require('node:assert/strict');

test('goal deadlines use calendar days and distinguish completed and undated goals', async () => {
  const { goalStatusLabel } = await import('../client/src/lib/format.js');
  const now = new Date(2026, 8, 18, 23, 59);
  assert.equal(goalStatusLabel({ targetDate: '2026-09-19' }, now).text, '1 day left');
  assert.equal(goalStatusLabel({ targetDate: '2026-09-20' }, now).text, '2 days left');
  assert.equal(goalStatusLabel({ targetDate: '2026-09-18' }, now).text, 'Due today');
  assert.equal(goalStatusLabel({ targetDate: '2026-09-17' }, now).text, '1 day overdue');
  assert.equal(goalStatusLabel({ targetDate: null }, now), null);
  assert.equal(goalStatusLabel({ targetDate: '2026-09-17', completed: true }, now).tone, 'done');
  assert.equal(goalStatusLabel({ targetDate: '2026-03-09' }, new Date(2026, 2, 7, 23, 59)).text, '2 days left');
});
