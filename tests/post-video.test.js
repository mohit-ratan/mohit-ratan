const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { videoRange, preparePostVideo } = require('../src/lib/postVideo');
const exec = promisify(execFile);

test('video clips require a valid duration, start and cover within the clip', () => {
  assert.deepEqual(videoRange({ videoStart: '5', videoEnd: '65', videoCover: '10' }), { start: 5, duration: 60, cover: 5 });
  for (const body of [{}, { videoStart: -1, videoEnd: 10 }, { videoEnd: 61 }, { videoEnd: .5 }, { videoEnd: 20, videoCover: 21 }, { videoStart: 'bad', videoEnd: 5 }]) {
    assert.throws(() => videoRange(body));
  }
});

test('real video processing trims, scales, preserves audio and produces a JPEG cover', { timeout: 30000 }, async () => {
  const binary = process.env.FFMPEG_PATH || require('ffmpeg-static');
  const folder = await mkdtemp(path.join(tmpdir(), 'psw-video-test-'));
  try {
    const source = path.join(folder, 'source.mp4');
    await exec(binary, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=1440x810:rate=10', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '3', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', source]);
    const result = await preparePostVideo({ buffer: await readFile(source) }, { videoStart: 1, videoEnd: 2.5, videoCover: 1.5 });
    assert.ok(result.buffer.length > 0);
    assert.equal(result.cover.subarray(0, 2).toString('hex'), 'ffd8');
    const output = path.join(folder, 'out.mp4');
    await writeFile(output, result.buffer);
    const info = await exec(binary, ['-i', output, '-f', 'null', '-']);
    assert.match(info.stderr, /Duration: 00:00:01\.5/);
    assert.match(info.stderr, /1280x720/);
    assert.match(info.stderr, /Audio: aac/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
