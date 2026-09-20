const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function mailer(env, fetch) {
  const sandbox = { module: { exports: {} }, process: { env }, fetch, AbortSignal,
    require: name => name === 'dotenv' ? { config() {} } : { createTransport() { throw new Error('Unexpected SMTP'); } } };
  vm.runInNewContext(fs.readFileSync('src/utils/mailer.js', 'utf8'), sandbox);
  return sandbox.module.exports.sendMail;
}
const message = { to: 'recipient@example.com', subject: 'Code', html: '<p>Test</p>' };
test('Resend bypasses relay and submits correct payload', async () => {
  let calls = 0;
  const send = mailer({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test', MAIL_FROM: 'sender@example.com' }, async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer test');
    assert.deepEqual(JSON.parse(options.body), { from: 'sender@example.com', to: [message.to], subject: 'Code', html: message.html, text: 'Test' });
    return { ok: true, json: async () => ({ id: 'accepted-id' }) };
  });
  assert.equal((await send(message)).messageId, 'accepted-id');
  assert.equal(calls, 1);
});
test('Resend rejection does not silently fall back', async () => {
  let calls = 0;
  const send = mailer({ RESEND_API_KEY: 'test', MAIL_FROM: 'sender@example.com' }, async () => {
    calls++; return { ok: false, status: 403, json: async () => ({ message: 'private details' }) };
  });
  await assert.rejects(send(message), /HTTP 403/);
  assert.equal(calls, 1);
});
test('explicit Resend without credentials fails before sending', async () => {
  await assert.rejects(mailer({ EMAIL_PROVIDER: 'resend' }, () => { throw new Error('Unexpected fetch'); })(message), /requires/);
});
test('missing transports cannot report success or log OTP', async () => {
  await assert.rejects(mailer({}, async () => { throw new Error('Unavailable'); })(message), /Email delivery unavailable/);
});
test('gateway remains available for existing deployments', async () => {
  const result = await mailer({}, async () => ({ ok: true, json: async () => ({ success: true, messageId: 'gateway-id' }) }))(message);
  assert.equal(result.messageId, 'gateway-id');
});
