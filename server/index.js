import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initDb } from './db/index.js';
import { resolvePort } from './utils/port.js';
import { errorHandler } from './middleware/error.js';

import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import memosRouter from './routes/memos.js';
import bookmarksRouter from './routes/bookmarks.js';
import foldersRouter from './routes/folders.js';
import tagsRouter from './routes/tags.js';
import llmRouter from './routes/llm.js';
import aiRouter from './routes/ai.js';
import dataRouter from './routes/data.js';
import logsRouter from './routes/logs.js';
import uploadsRouter from './routes/uploads.js';
import sharesRouter from './routes/shares.js';
import ssrRouter from './routes/ssr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const startServer = async () => {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Database initialization
  const dbPath = process.env.DB_PATH || path.join(rootDir, 'data', 'mesh-notes.db');
  initDb(dbPath);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/memos', memosRouter);
  app.use('/api/bookmarks', bookmarksRouter);
  app.use('/api/folders', foldersRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/llm', llmRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/shares', sharesRouter);

  // Static assets for SSR site & docs (/css/site.css)
  const serverPublic = path.join(__dirname, 'public');
  if (fs.existsSync(serverPublic)) {
    app.use(express.static(serverPublic));
  }

  // SSR Routes: Landing Page (/) and Docs (/docs, /docs/:slug)
  app.use(ssrRouter);

  // Static frontend serving (PWA / SPA)
  const clientDist = path.join(rootDir, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    // Serve sw.js with no-cache so browsers always discover updates
    app.get('/sw.js', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(path.join(clientDist, 'sw.js'));
    });

    app.use(express.static(clientDist, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    // SPA routing: /app, /app/*, /s/:token
    app.get(['/app', '/app/{*splat}', '/s/:token'], (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    console.warn('⚠️ [Frontend] client/dist not found. Run "npm run build" first to build production frontend.');
  }

  // Central error handling
  app.use(errorHandler);

  // Port resolution per guidelines: use port.txt, else find/save available port
  const port = await resolvePort(rootDir);

  const server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Mesh Notes Server running on http://localhost:${port}`);
    console.log(`📁 Database: ${dbPath}`);
    console.log(`🔌 API Endpoints: http://localhost:${port}/api/memos`);
    console.log(`======================================================\n`);
  });

  return { app, server, port };
};

startServer().catch((err) => {
  console.error('[FATAL] Failed starting server:', err);
  process.exit(1);
});
