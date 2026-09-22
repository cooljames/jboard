import { defineConfig } from 'vite';
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

export default defineConfig({
  plugins: [vercelApiDevPlugin()],
  server: {
    port: 3000,
    open: false
  }
});
