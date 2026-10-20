import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const BUCKETS = {
  photos: 'henkaten-photos',
  docs: 'henkaten-trial-docs',
} as const;

export type BucketKey = keyof typeof BUCKETS;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('Kredensial Object Storage belum di-set');
    }
    client = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-2',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export function publicUrl(bucket: BucketKey, key: string): string {
  return `${process.env.AWS_ENDPOINT_URL_S3}/${BUCKETS[bucket]}/${key}`;
}

export async function presignUpload(
  bucket: BucketKey,
  key: string,
  contentType: string
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );
}
