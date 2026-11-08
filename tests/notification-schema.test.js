const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ensureNotificationTable } = require('../src/lib/notificationSchema');

test('startup preserves existing reaction notifications across repeated migrations', async () => {
  const rows = [{ id: 'existing-reaction', type: 'reaction' }, { id: 'existing-like', type: 'like' }];
  const statements = [];
  const pool = { query: async sql => {
    statements.push(sql);
    if (sql.startsWith('ALTER TABLE')) {
      const types = [...sql.matchAll(/'([^']+)'/g)].map(match => match[1]);
      // MySQL rejects an enum change that excludes a stored value.
      for (const row of rows) assert.ok(types.includes(row.type), `Would truncate ${row.type}`);
      assert.ok(types.includes('partner_request'));
      assert.ok(types.includes('partner_accepted'));
      assert.ok(types.includes('partner_missed'));
    }
    return [{}];
  } };
  await ensureNotificationTable(pool);
  await ensureNotificationTable(pool);
  assert.equal(statements.filter(sql => sql.startsWith('ALTER TABLE')).length, 2);
  assert.deepEqual(rows, [{ id: 'existing-reaction', type: 'reaction' }, { id: 'existing-like', type: 'like' }]);
});

test('notification migration waits for table creation and stops if creation fails', async () => {
  let created = false;
  const pool = { query: async sql => {
    if (sql.trimStart().startsWith('CREATE TABLE')) {
      await new Promise(resolve => setImmediate(resolve));
      created = true;
    } else assert.equal(created, true, 'ALTER must wait for CREATE');
    return [{}];
  } };
  await ensureNotificationTable(pool);

  let calls = 0;
  const failure = new Error('table creation failed');
  await assert.rejects(ensureNotificationTable({ query: async () => {
    calls++;
    throw failure;
  } }), failure);
  assert.equal(calls, 1);
});
