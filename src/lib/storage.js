const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { datedMediaPath } = require('./mediaPath');

// Cloudflare R2 speaks the S3 API, so the standard AWS SDK works against it
// once pointed at the account's R2 endpoint — this is why uploaded media
// now survives redeploys: it's stored off the app server entirely, instead
// of on local disk (which the hosting platform doesn't guarantee persists
// across deploys — see the .gitignore note on public/assets/uploads).
const bucket = process.env.R2_BUCKET;
const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const MAX_UNCOMPRESSED_BYTES = 3 * 1024 * 1024;

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Photos over 3MB get resized/re-encoded before upload — real size
// reduction, unlike gzip on an already-compressed format (JPEG/PNG/MP4
// barely shrink under generic compression). Skipped for GIFs, which would
// collapse to a single frame, and anything sharp can't decode; falls back
// to the original bytes rather than failing the upload outright.
async function compressImageIfLarge(buffer, mimetype) {
  if (!mimetype.startsWith('image/') || mimetype === 'image/gif' || buffer.length <= MAX_UNCOMPRESSED_BYTES) {
    return { buffer, mimetype, ext: null };
  }
  try {
    const image = sharp(buffer).rotate(); // .rotate() with no args auto-orients from EXIF
    const metadata = await image.metadata();
    const resized = image.resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true });
    // Keep transparency (WebP) instead of flattening it onto a JPEG background.
    if (metadata.hasAlpha) {
      return { buffer: await resized.webp({ quality: 82 }).toBuffer(), mimetype: 'image/webp', ext: '.webp' };
    }
    return { buffer: await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), mimetype: 'image/jpeg', ext: '.jpg' };
  } catch (err) {
    console.error('Image compression failed, uploading original:', err.message);
    return { buffer, mimetype, ext: null };
  }
}

// Uploads a buffer under a fresh random key inside `folder` (e.g. "posts",
// "stories", "avatars") and returns the full public URL to store directly
// in the database — the frontend's mediaUrl() helper already passes
// absolute http(s) URLs through unchanged.
async function uploadMedia(buffer, originalName, mimetype, folder) {
  const compressed = await compressImageIfLarge(buffer, mimetype);
  const ext = compressed.ext || (originalName || '').match(/\.[a-zA-Z0-9]+$/)?.[0]?.slice(0, 10) || '';
  const key = datedMediaPath(folder, `${uuidv4()}${ext}`);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: compressed.buffer,
    ContentType: compressed.mimetype,
  }));
  return `${publicUrl}/${key}`;
}

// Deletes a previously uploaded file given the full public URL stored in
// the database. A no-op for anything that isn't one of our R2 URLs (e.g.
// legacy local-disk uploads from before this migration).
async function deleteMedia(url) {
  if (!url || !publicUrl || !url.startsWith(`${publicUrl}/`)) return;
  const key = url.slice(publicUrl.length + 1);
  if (!key) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

module.exports = { uploadMedia, deleteMedia };
