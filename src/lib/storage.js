const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Cloudflare R2 speaks the S3 API, so the standard AWS SDK works against it
// once pointed at the account's R2 endpoint — this is why uploaded media
// now survives redeploys: it's stored off the app server entirely, instead
// of on local disk (which the hosting platform doesn't guarantee persists
// across deploys — see the .gitignore note on public/assets/uploads).
const bucket = process.env.R2_BUCKET;
const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Uploads a buffer under a fresh random key and returns the full public URL
// to store directly in the database — the frontend's mediaUrl() helper
// already passes absolute http(s) URLs through unchanged.
async function uploadMedia(buffer, originalName, mimetype) {
  const ext = (originalName || '').match(/\.[a-zA-Z0-9]+$/)?.[0]?.slice(0, 10) || '';
  const key = `${uuidv4()}${ext}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
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
