// One-time maintenance: re-compress photos already in the henkaten-photos bucket.
// New uploads are compressed client-side (src/lib/compressImage.ts); this fixes the backlog.
//
// Usage (PowerShell):
//   node --env-file=.env.local scripts/recompress-photos.mjs --dry-run   # preview
//   node --env-file=.env.local scripts/recompress-photos.mjs             # apply
//
// Needs DATABASE_URL + AWS_* (dari `neon env pull`). Kredensial tidak dikirim ke browser.

import { neon } from '@neondatabase/serverless';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const BUCKET = 'henkaten-photos';
const MAX_DIMENSION = 1600;
const QUALITY = 72;
const SKIP_BELOW_BYTES = 400 * 1024; // already small enough, leave it

const DRY_RUN = process.argv.includes('--dry-run');

// --- pure helper (self-tested below) -----------------------------------------
/** Extract the in-bucket object key from a public storage URL, or null. */
export function objectKeyFromUrl(url) {
  if (typeof url !== 'string') return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

if (process.argv.includes('--self-test')) {
  const assert = (await import('node:assert')).strict;
  const base = 'https://br-xxx.storage.c-6.us-east-2.aws.neon.tech/henkaten-photos/';
  assert.equal(objectKeyFromUrl(base + '123-abc.jpg'), '123-abc.jpg');
  assert.equal(objectKeyFromUrl(base + 'a%20b.png?token=1'), 'a b.png');
  assert.equal(objectKeyFromUrl('https://other.com/x.jpg'), null);
  assert.equal(objectKeyFromUrl(null), null);
  console.log('self-test ok');
  process.exit(0);
}

// --- main -------------------------------------------------------------------
const databaseUrl = process.env.DATABASE_URL;
const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
if (!databaseUrl || !endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing DATABASE_URL / AWS_* — jalankan `neon env pull --file .env.local`.');
  process.exit(1);
}

const sql = neon(databaseUrl);
const client = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-2',
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const rows = await sql`select id, photo from henkaten_records where photo is not null`;
console.log(`${rows.length} record(s) with a photo. ${DRY_RUN ? '(dry run)' : ''}`);

let compressed = 0, skipped = 0, failed = 0, bytesBefore = 0, bytesAfter = 0;

for (const row of rows) {
  const key = objectKeyFromUrl(row.photo);
  if (!key) {
    console.log(`- skip ${row.id}: photo URL not in ${BUCKET} (${row.photo})`);
    skipped++;
    continue;
  }

  try {
    const object = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const input = Buffer.from(await object.Body.transformToByteArray());

    if (input.length < SKIP_BELOW_BYTES) {
      skipped++;
      continue;
    }

    const output = await sharp(input, { failOn: 'none' }) // tolerate slightly-truncated JPEGs
      .rotate() // bake in EXIF orientation before metadata is dropped
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer();

    if (output.length >= input.length) {
      skipped++;
      continue;
    }

    bytesBefore += input.length;
    bytesAfter += output.length;
    const pct = Math.round((1 - output.length / input.length) * 100);
    console.log(`- ${key}: ${(input.length / 1024 / 1024).toFixed(2)}MB -> ${(output.length / 1024).toFixed(0)}KB (-${pct}%)`);

    if (!DRY_RUN) {
      await client.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: output, ContentType: 'image/jpeg' })
      );
    }
    compressed++;
  } catch (err) {
    console.error(`- FAIL ${key}: ${err.message}`);
    failed++;
  }
}

console.log(
  `\nDone. compressed=${compressed} skipped=${skipped} failed=${failed}\n` +
  `Saved ${((bytesBefore - bytesAfter) / 1024 / 1024).toFixed(1)}MB ` +
  `(${(bytesBefore / 1024 / 1024).toFixed(1)}MB -> ${(bytesAfter / 1024 / 1024).toFixed(1)}MB)` +
  (DRY_RUN ? ' — dry run, nothing written.' : '')
);
