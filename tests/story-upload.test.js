const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('successful status upload returns media immediately for the story list', async () => {
  let inserted = false;
  const sandbox = { module: { exports: {} }, console, require: (name) => name === '../db' ? { query: async () => { inserted = true; return [{}]; } } : name === 'uuid' ? { v4: () => 'story-id' } : name === '../lib/follows' ? { canView: async () => true } : name === '../lib/notifications' ? { notify: async () => {} } : name === '../lib/storage' ? { uploadMedia: async () => '/assets/uploads/small.jpg', deleteMedia: async () => {} } : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/storiesController.js'), 'utf8'), sandbox);
  let response;
  const res = { json(value) { response = value; }, status() { return this; } };
  await sandbox.module.exports.create({ userId: 'owner', file: { filename: 'small.jpg', mimetype: 'image/jpeg' }, body: { tag: '#Fitness', vibe: '', aiStyled: 'false' } }, res);
  assert.equal(inserted, true);
  assert.equal(response.story.id, 'story-id');
  assert.equal(response.story.mediaUrl, '/assets/uploads/small.jpg');
  assert.equal(response.story.mediaType, 'image');
  assert.equal(response.story.tag, 'fitness');
  assert.equal(response.story.viewedByMe, false);
  assert.equal(response.story.aiStyled, false);
});
