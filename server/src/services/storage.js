import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { config } from '../config.js';

let supabaseClient = null;
let s3Client = null;
let bucketEnsured = false;

function getSupabaseClient() {
  if (!supabaseClient && config.supabase.url && config.supabase.serviceKey) {
    supabaseClient = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

function getS3Client() {
  if (!s3Client && config.r2.accessKeyId && config.r2.secretAccessKey) {
    const endpoint = config.r2.accountId
      ? `https://${config.r2.accountId}.r2.cloudflarestorage.com`
      : undefined;

    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3Client;
}

async function ensureSupabaseBucket(client, bucketName) {
  if (bucketEnsured) return;
  try {
    const { data, error } = await client.storage.getBucket(bucketName);
    if (!data || error) {
      await client.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 26214400, // 25MB
      });
    }
    bucketEnsured = true;
  } catch (err) {
    // Bucket might already exist or was pre-created in dashboard
    bucketEnsured = true;
  }
}

/**
 * Uploads a file buffer to storage.
 * Prioritizes Supabase Storage, with fallback to R2 and local mock.
 * Key structure: uploads/<kind>/<uuid>-<original-name>
 */
export async function uploadFile({ buffer, originalName, mimeType, kind = 'misc' }) {
  const safeName = path.basename(originalName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `uploads/${kind}/${randomUUID()}-${safeName}`;

  // 1. Supabase Storage (Primary)
  const supabase = getSupabaseClient();
  if (supabase) {
    const bucket = config.supabase.bucket;
    await ensureSupabaseBucket(supabase, bucket);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(key, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      throw error;
    }

    return {
      key,
      name: safeName,
      size: buffer ? buffer.length : 0,
      mimeType,
      provider: 'supabase',
    };
  }

  // 2. Cloudflare R2 (Legacy / fallback)
  const s3 = getS3Client();
  if (s3) {
    await s3.send(
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
      provider: 'r2',
    };
  }

  // 3. Simulated key for local development / testing
  console.warn('Storage credentials (Supabase / R2) not configured. Using local mock key.');
  return {
    key,
    name: safeName,
    size: buffer ? buffer.length : 0,
    mimeType,
    provider: 'mock',
  };
}

/**
 * Generates a presigned read URL valid for the specified duration (default 1 hour / 3600 seconds).
 */
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  if (!key) return null;

  // 1. Supabase Storage (Primary)
  const supabase = getSupabaseClient();
  if (supabase) {
    const bucket = config.supabase.bucket;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);

    if (error || !data?.signedUrl) {
      // Key may not exist in live bucket during testing/mocking; gracefully fallback to mock URL
      return `http://localhost:4000/api/files/mock/${key}`;
    }

    return data.signedUrl;
  }

  // 2. Cloudflare R2 (Legacy / fallback)
  const s3 = getS3Client();
  if (s3) {
    const command = new GetObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
  }

  // 3. Development fallback URL
  return `http://localhost:4000/api/files/mock/${key}`;
}
