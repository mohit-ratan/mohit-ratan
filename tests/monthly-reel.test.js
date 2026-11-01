const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('monthly reel has an intro, authorized recap photos in order, and an ending', async () => {
  const { buildReelSlides } = await import('../client/src/lib/monthlyReel.mjs');
  const photos = [{ id: 'p1', mediaUrl: '/first.jpg' }, { id: 'p2', mediaUrl: '/second.jpg' }];
  const recap = { label: 'October 2026', images: photos, highlights: ['A recorded milestone.'] };
  const slides = buildReelSlides(recap);
  assert.equal(slides[0].type, 'intro');
  assert.equal(slides.at(-1).type, 'outro');
  assert.deepEqual(slides.filter(slide => slide.type === 'photo').map(slide => slide.photo), photos);
  assert.ok(slides.slice(1, -1).every(slide => slide.caption === recap.highlights[0]));
  assert.ok(slides.every(slide => slide.duration >= 3000));
});
test('reel music follows the main category without mutating recap data', async () => {
  const { monthlyReelMusic } = await import('../client/src/lib/monthlyReel.mjs');
  const recap = { categories: [{ category: 'health', posts: 2 }, { category: 'relationships', posts: 8 }] };
  assert.equal(monthlyReelMusic(recap).src, '/audio/monthly-relationships.wav');
  assert.equal(recap.categories[0].category, 'health');
  for (const category of ['health', 'wealth', 'relationships']) {
    const track = monthlyReelMusic({ categories: [{ category, posts: 1 }] });
    const bytes = fs.readFileSync(path.join(__dirname, '../client/public', track.src));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WAVE');
    assert.ok(bytes.length > 100000);
  }
  assert.equal(monthlyReelMusic({ categories: [] }).src, '/audio/monthly-health.wav');
});

test('monthly reel celebrates every recorded award before its closing slide', async () => {
  const { buildReelSlides } = await import('../client/src/lib/monthlyReel.mjs');
  const awards = [{ id: 'goal:walk', kind: 'goal', category: 'health', targetDays: 20 }, { id: 'streak:walk', kind: 'streak', days: 20 }, { id: 'trifecta-45', kind: 'trifecta' }];
  const slides = buildReelSlides({ label: 'October 2026', images: [], highlights: [], awards });
  assert.deepEqual(slides.filter(slide => slide.type === 'award').map(slide => slide.award), awards);
  assert.equal(slides.at(-1).type, 'outro');
});
