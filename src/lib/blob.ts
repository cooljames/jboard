import { put, del, list } from '@vercel/blob';

/**
 * Uploads a file/buffer to Vercel Blob storage
 */
export async function uploadToBlob(
  pathname: string,
  body: string | Buffer | Blob,
  options?: { contentType?: string; access?: 'public' }
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('[Blob] BLOB_READ_WRITE_TOKEN is not set. Using local mock URL.');
    return {
      url: `data:${options?.contentType || 'application/octet-stream'};base64,mock_blob_storage_data`,
      pathname,
      contentType: options?.contentType || 'application/octet-stream',
    };
  }

  try {
    const blob = await put(pathname, body, {
      access: options?.access || 'public',
      contentType: options?.contentType,
      token,
    });
    return blob;
  } catch (error) {
    console.error('[Blob] Failed to upload to Vercel Blob:', error);
    throw error;
  }
}

/**
 * Lists blobs with optional prefix
 */
export async function listBlobs(prefix?: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return [];
  try {
    const result = await list({ prefix, token });
    return result.blobs;
  } catch (err) {
    console.error('[Blob] Failed to list blobs:', err);
    return [];
  }
}

/**
 * Deletes a blob by its full URL
 */
export async function deleteBlob(url: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  try {
    await del(url, { token });
  } catch (err) {
    console.error('[Blob] Failed to delete blob:', err);
  }
}
