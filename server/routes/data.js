import express from 'express';
import multer from 'multer';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { importNetscapeBookmarks, importJsonArchive, importCsvData } from '../services/importer.js';
import { exportUserDataAsZip } from '../services/exporter.js';
import { logAudit } from '../utils/logger.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const router = express.Router();
router.use(authenticate);

// Import file (HTML, JSON, CSV)
router.post('/import', upload.single('file'), async (req, res) => {
  const userId = req.user.id;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filename = req.file.originalname.toLowerCase();
  const fileContent = req.file.buffer.toString('utf-8');

  try {
    if (filename.endsWith('.html') || filename.endsWith('.htm') || fileContent.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>')) {
      const result = await importNetscapeBookmarks(userId, fileContent);
      return res.json({ success: true, message: `Successfully imported ${result.importedCount} bookmarks.` });
    } else if (filename.endsWith('.json')) {
      const parsed = JSON.parse(fileContent);
      const result = importJsonArchive(userId, parsed);
      return res.json({ success: true, message: `Successfully imported ${result.memoCount} items.` });
    } else if (filename.endsWith('.csv')) {
      const result = importCsvData(userId, fileContent);
      return res.json({ success: true, message: `Successfully imported ${result.count} items from CSV.` });
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload .html, .json, or .csv.' });
    }
  } catch (err) {
    console.error('[Data] Import error:', err);
    return res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

// Export zip archive
router.get('/export', (req, res) => {
  try {
    exportUserDataAsZip(req.user.id, res);
  } catch (err) {
    console.error('[Data] Export error:', err);
    return res.status(500).json({ error: 'Failed to generate export archive.' });
  }
});

// Data Purge
router.post('/purge', (req, res) => {
  const userId = req.user.id;
  const { target, confirm } = req.body;
  const db = getDb();

  if (target === 'cache') {
    const result = db.prepare(`
      DELETE FROM article_cache 
      WHERE bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)
    `).run(userId);

    logAudit(userId, 'purge_cache', { removed: result.changes });
    return res.json({ success: true, message: `Cleared cached article data for ${result.changes} bookmarks.` });
  }

  if (target === 'account') {
    if (confirm !== 'WIPE') {
      return res.status(400).json({ error: 'Confirmation required. Pass confirm: "WIPE"' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM memos WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM folders WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM tags WHERE user_id = ?').run(userId);
    })();

    logAudit(userId, 'purge_account_data', {}, 'warn');
    return res.json({ success: true, message: 'All personal memos, bookmarks, and folders have been purged.' });
  }

  return res.status(400).json({ error: 'Invalid target specified.' });
});

export default router;
