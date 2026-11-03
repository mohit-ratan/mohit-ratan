const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { mkdtemp, writeFile, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const exec = promisify(execFile);

function videoRange(body = {}) {
  const start = Number(body.videoStart ?? 0);
  const end = Number(body.videoEnd);
  const cover = Number(body.videoCover ?? start);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(cover) || start < 0 || end <= start || end - start > 60.05 || cover < start || cover > end) {
    throw new Error('Choose a video clip between 1 and 60 seconds and a cover inside the clip.');
  }
  if (end - start < 1) throw new Error('Your video clip must be at least one second.');
  return { start, duration: Math.min(60, end - start), cover: cover - start };
}

let activeEncodes = 0;
async function preparePostVideo(file, body) {
  const range = videoRange(body);
  if (activeEncodes >= 2) throw new Error('Video processing is busy. Please try again in a moment.');
  const folder = await mkdtemp(path.join(tmpdir(), 'psw-video-'));
  activeEncodes += 1;
  try {
    const binary = process.env.FFMPEG_PATH || require('ffmpeg-static');
    const input = path.join(folder, 'source');
    const output = path.join(folder, 'clip.mp4');
    const cover = path.join(folder, 'cover.jpg');
    await writeFile(input, file.buffer);
    const options = { timeout: 180000, maxBuffer: 2 * 1024 * 1024 };
    await exec(binary, ['-nostdin', '-y', '-protocol_whitelist', 'file,pipe', '-i', input,
      '-ss', String(range.start), '-t', String(range.duration), '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
      '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '27', '-maxrate', '1800k', '-bufsize', '3600k',
      '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', output], options);
    await exec(binary, ['-nostdin', '-y', '-i', output, '-ss', String(Math.max(0, Math.min(range.cover, range.duration - .2))), '-frames:v', '1', '-q:v', '3', cover], options);
    return { buffer: await readFile(output), cover: await readFile(cover) };
  } catch (err) {
    console.error('Video preparation failed:', err.code || err.message);
    throw new Error('Could not prepare this video. Try an MP4 or MOV with a clip of 1–60 seconds.');
  } finally {
    activeEncodes -= 1;
    await rm(folder, { recursive: true, force: true });
  }
}
module.exports = { videoRange, preparePostVideo };
