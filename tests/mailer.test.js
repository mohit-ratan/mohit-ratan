const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function mailer(env, fetch, smtpSendMail) {
  const sandbox = {
    module: { exports: {} },
    process: { env },
    fetch,
    AbortSignal,
    require: (name) => name === 'dotenv'
      ? { config() {} }
      : { createTransport: () => (smtpSendMail ? { sendMail: smtpSendMail } : { sendMail: () => { throw new Error('Unexpected SMTP'); } }) },
  };
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

test('Resend rejection falls back to the gateway', async () => {
  let fetchCalls = 0;
  const send = mailer({ RESEND_API_KEY: 'test', MAIL_FROM: 'sender@example.com' }, async (url) => {
    fetchCalls++;
    if (url === 'https://api.resend.com/emails') return { ok: false, status: 403, json: async () => ({ message: 'private details' }) };
    if (url === 'http://127.0.0.1:2525/api/email/send') return { ok: true, json: async () => ({ success: true, messageId: 'gateway-id' }) };
    throw new Error(`unexpected url ${url}`);
  });
  const result = await send(message);
  assert.equal(result.messageId, 'gateway-id');
  assert.equal(fetchCalls, 2);
});

test('Resend and gateway both failing falls back to SMTP', async () => {
  let smtpCalled = false;
  const send = mailer(
    { RESEND_API_KEY: 'test', MAIL_FROM: 'sender@example.com', SMTP_HOST: 'smtp.example.com' },
    async () => { throw new Error('network down'); }, // both Resend and the gateway use fetch and fail identically
    async (opts) => { smtpCalled = true; assert.equal(opts.to, message.to); return { messageId: 'smtp-id' }; }
  );
  const result = await send(message);
  assert.equal(smtpCalled, true);
  assert.equal(result.messageId, 'smtp-id');
});

test('everything failing reports all attempted transports', async () => {
  // The gateway only appears in the combined error when it's reached and
  // rejects the request — an unreachable gateway (the common case, since
  // most hosts don't have one) returns null silently by design.
  const send = mailer(
    { RESEND_API_KEY: 'test', MAIL_FROM: 'sender@example.com', SMTP_HOST: 'smtp.example.com' },
    async (url) => {
      if (url === 'https://api.resend.com/emails') return { ok: false, status: 500, json: async () => ({}) };
      if (url === 'http://127.0.0.1:2525/api/email/send') return { ok: false, status: 500, json: async () => ({ error: 'boom' }) };
      throw new Error(`unexpected url ${url}`);
    },
    async () => { throw new Error('smtp rejected'); }
  );
  await assert.rejects(send(message), /Resend:.*Gateway:.*SMTP:/s);
});

test('missing transports cannot report success or log OTP', async () => {
  await assert.rejects(mailer({}, async () => { throw new Error('Unavailable'); })(message), /No transport is configured/);
});

test('gateway remains available for existing deployments', async () => {
  const result = await mailer({}, async () => ({ ok: true, json: async () => ({ success: true, messageId: 'gateway-id' }) }))(message);
  assert.equal(result.messageId, 'gateway-id');
});
