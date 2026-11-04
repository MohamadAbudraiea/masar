import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { config } from '../config.js';

let s3 = null;

function getS3Client() {
  if (!s3) {
    const endpoint = config.r2.accountId
      ? `https://${config.r2.accountId}.r2.cloudflarestorage.com`
      : undefined;

    s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3;
}

/**
 * Uploads a file buffer to Cloudflare R2 bucket.
 * Key structure: uploads/<kind>/<uuid>-<original-name>
 */
export async function uploadFile({ buffer, originalName, mimeType, kind = 'misc' }) {
  const safeName = path.basename(originalName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `uploads/${kind}/${randomUUID()}-${safeName}`;

  // If R2 credentials are not set, return simulated key for local development
  if (!config.r2.accessKeyId || !config.r2.secretAccessKey) {
    console.warn('R2 credentials not configured. Using local mock key.');
    return {
      key,
      name: safeName,
      size: buffer ? buffer.length : 0,
      mimeType,
    };
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return {
    key,
    name: safeName,
    size: buffer.length,
    mimeType,
  };
}

/**
 * Generates a presigned read URL valid for 1 hour (3600 seconds).
 */
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  if (!key) return null;

  if (!config.r2.accessKeyId || !config.r2.secretAccessKey) {
    // Development fallback URL
    return `http://localhost:4000/api/files/mock/${key}`;
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

