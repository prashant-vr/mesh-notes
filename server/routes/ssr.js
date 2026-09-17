import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderHtmlLayout } from '../templates/layout.js';
import { renderDocsPage } from '../templates/docs.js';
import { renderMarkdown } from '../utils/markdown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.resolve(__dirname, '..', 'content', 'docs');

const router = express.Router();

// Load and cache docs on startup
let cachedDocs = null;

const loadDocs = () => {
  if (cachedDocs) return cachedDocs;

  if (!fs.existsSync(docsDir)) {
    cachedDocs = [];
    return cachedDocs;
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();
  cachedDocs = files.map(file => {
    const raw = fs.readFileSync(path.join(docsDir, file), 'utf-8');
    // Slug is filename without prefix digits and .md (e.g. 01-getting-started.md -> getting-started)
    const slug = file.replace(/^\d+-/, '').replace(/\.md$/, '');
    
    // Extract first # title from markdown
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    const { html, toc } = renderMarkdown(raw);

    return {
      file,
      slug,
      title,
      html,
      toc
    };
  });

  return cachedDocs;
};

// GET / - Modern Static HTML Landing Page
router.get('/', (req, res) => {
  const landingHtmlPath = path.resolve(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(landingHtmlPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.sendFile(landingHtmlPath);
  }
  res.status(404).send('Landing page not found.');
});

// GET /docs - Redirects to first doc or renders overview
router.get('/docs', (req, res) => {
  const docs = loadDocs();
  if (docs.length > 0) {
    return res.redirect(301, `/docs/${docs[0].slug}`);
  }
  res.status(404).send('No documentation found.');
});

// GET /docs/:slug - SSR Documentation Chapter
router.get('/docs/:slug', (req, res) => {
  const { slug } = req.params;

  // Strict slug validation against path traversal / injection
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return res.status(400).send('Invalid documentation topic requested.');
  }

  const docs = loadDocs();
  const currentDoc = docs.find(d => d.slug === slug);

  if (!currentDoc) {
    return res.status(404).send(renderHtmlLayout({
      title: 'Page Not Found - Mesh Notes Docs',
      description: 'The requested documentation topic does not exist.',
      activeNav: 'docs',
      bodyContent: `
        <div class="container" style="padding: 6rem 1.5rem; text-align: center;">
          <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Document Not Found</h1>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">We couldn't find the documentation page you were looking for.</p>
          <a href="/docs" class="btn btn-primary">Return to Documentation</a>
        </div>
      `
    }));
  }

  const bodyContent = renderDocsPage({
    currentSlug: currentDoc.slug,
    currentDoc,
    docHtml: currentDoc.html,
    toc: currentDoc.toc,
    allDocs: docs
  });

  const fullHtml = renderHtmlLayout({
    title: `${currentDoc.title} - Mesh Notes Documentation`,
    description: `Learn how to use Mesh Notes: ${currentDoc.title}`,
    activeNav: 'docs',
    bodyContent
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(fullHtml);
});

export default router;
