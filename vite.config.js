import { defineConfig, loadEnv } from 'vite';
import postsHandler from './api/posts.js';
import uploadHandler from './api/upload.js';
import authHandler from './api/auth.js';
import analyticsHandler from './api/analytics.js';

function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
        const query = Object.fromEntries(urlObj.searchParams.entries());

        let body = null;
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const raw = Buffer.concat(buffers).toString();
          try {
            body = JSON.parse(raw);
          } catch (e) {
            body = raw;
          }
        }

        if (!res.status) {
          res.status = function(code) {
            res.statusCode = code;
            return res;
          };
        }
        if (!res.json) {
          res.json = function(data) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(data));
            return res;
          };
        }

        req.query = query;
        req.body = body;

        const pathname = urlObj.pathname;
        if (pathname === '/api/posts') {
          return postsHandler(req, res);
        }
        if (pathname === '/api/upload') {
          return uploadHandler(req, res);
        }
        if (pathname === '/api/auth') {
          return authHandler(req, res);
        }
        if (pathname === '/api/analytics') {
          return analyticsHandler(req, res);
        }

        res.status(404).json({ error: 'API route not found' });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // .env / .env.local 파일 로드 → 로컬 dev 서버의 API 핸들러(Neon, Blob)가
  // process.env.DATABASE_URL / BLOB_READ_WRITE_TOKEN을 읽을 수 있게 주입.
  // (VITE_ 접두사가 없으므로 클라이언트 번들에는 노출되지 않음)
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'JWT_SECRET']) {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key];
    }
  }
  if (process.env.DATABASE_URL) {
    console.log('[JBoard dev] DATABASE_URL loaded — Neon Postgres mode');
  } else {
    console.log('[JBoard dev] DATABASE_URL not set — in-memory fallback mode');
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('[JBoard dev] BLOB_READ_WRITE_TOKEN loaded — Vercel Blob mode');
  } else {
    console.log('[JBoard dev] BLOB_READ_WRITE_TOKEN not set — DataURL fallback mode');
  }

  return {
    plugins: [vercelApiDevPlugin()],
    server: {
      port: 3000,
      open: false
    }
  };
});
