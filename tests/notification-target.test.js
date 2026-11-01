const { test } = require('node:test');
const assert = require('node:assert/strict');

test('post activity opens its exact post from any page', async () => {
  const { notificationTarget } = await import('../client/src/lib/notificationTarget.mjs');
  for (const type of ['like', 'comment', 'reaction']) {
    assert.equal(notificationTarget({ type, postId: 'specific-post', actorId: 'sender' }), '/?post=specific-post');
    assert.equal(notificationTarget({ type, post_id: 'legacy-post', actorId: 'sender' }), '/?post=legacy-post');
    assert.equal(notificationTarget({ type, postId: null, actorId: 'sender' }), null);
  }
  assert.equal(notificationTarget({ type: 'like', postId: 'post/&?', actorId: 'sender' }), '/?post=post%2F%26%3F');
});
test('people notifications retain their profile destination', async () => {
  const { notificationTarget } = await import('../client/src/lib/notificationTarget.mjs');
  assert.equal(notificationTarget({ type: 'follow_accepted', actorId: 'sender' }), '/profile/sender');
  assert.equal(notificationTarget({ type: 'partner_request', actorId: 'partner' }), '/profile/partner');
});
