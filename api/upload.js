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

    // Check for BLOB_READ_WRITE_TOKEN
    const rawToken = process.env.BLOB_READ_WRITE_TOKEN;
    const token = rawToken ? rawToken.trim().replace(/^["']|["']$/g, '') : null;

    // If valid token is configured (not dummy placeholder), attempt Vercel Blob upload
    if (token && !token.includes('***') && token.length > 10) {
      try {
        const blob = await put(safeFilename, buffer, {
          access: 'public',
          contentType: contentType || 'application/octet-stream',
          token
        });

        return res.status(200).json({
          success: true,
          url: blob.url,
          pathname: blob.pathname,
          size: buffer.length,
          contentType: contentType || 'application/octet-stream'
        });
      } catch (blobErr) {
        console.warn('[Vercel Blob Token Error - Falling back to Data URL]:', blobErr.message);
        // Fallback to Data URL so user post never fails due to token permissions
        const mimeType = contentType || 'application/octet-stream';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return res.status(200).json({
          success: true,
          url: dataUrl,
          pathname: safeFilename,
          size: buffer.length,
          contentType: mimeType,
          warning: `Vercel Blob 인증 오류 (${blobErr.message}). Vercel Storage 탭에서 Blob Store 연결을 확인하세요.`
        });
      }
    }

    // Local / Offline Fallback when token is not yet configured or placeholder
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
