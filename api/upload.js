import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // raw body
      }
    }

    const { filename, contentType, base64 } = body || {};

    if (!base64 || !filename) {
      return res.status(400).json({ error: 'filename and base64 data are required' });
    }

    const buffer = Buffer.from(base64, 'base64');
    const safeFilename = `jboard/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // If BLOB_READ_WRITE_TOKEN is present, upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(safeFilename, buffer, {
        access: 'public',
        contentType: contentType || 'application/octet-stream',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      return res.status(200).json({
        success: true,
        url: blob.url,
        pathname: blob.pathname,
        size: buffer.length,
        contentType: contentType || 'application/octet-stream'
      });
    }

    // Local Fallback when token is not yet configured
    const mimeType = contentType || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({
      success: true,
      url: dataUrl,
      pathname: safeFilename,
      size: buffer.length,
      contentType: mimeType,
      isLocalMock: true
    });
  } catch (error) {
    console.error('[Upload API Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'File upload failed'
    });
  }
}
