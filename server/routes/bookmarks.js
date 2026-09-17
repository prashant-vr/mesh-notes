import express from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// List bookmarks
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { reading_status, limit = 50, offset = 0 } = req.query;
  const db = getDb();

  let query = `
    SELECT b.*, ac.reading_time_mins, ac.byline,
      (SELECT COUNT(*) FROM article_cache WHERE bookmark_id = b.id AND readable_html IS NOT NULL) as has_cache
    FROM bookmarks b
    LEFT JOIN article_cache ac ON b.id = ac.bookmark_id
    WHERE b.user_id = ?
  `;
  const params = [userId];

  if (reading_status) {
    query += ' AND b.reading_status = ?';
    params.push(reading_status);
  }

  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const rows = db.prepare(query).all(...params);
    return res.json({ bookmarks: rows });
  } catch (err) {
    console.error('[Bookmarks] List error:', err);
    return res.status(500).json({ error: 'Failed to retrieve bookmarks.' });
  }
});

// Get reader mode content for in-stream drawer
router.get('/:id/reader', (req, res) => {
  const db = getDb();
  const bookmark = db.prepare(`
    SELECT b.*, ac.readable_html, ac.readable_text, ac.byline, ac.reading_time_mins, ac.fetched_at
    FROM bookmarks b
    LEFT JOIN article_cache ac ON b.id = ac.bookmark_id
    WHERE b.id = ? AND b.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found.' });
  }

  logAudit(req.user.id, 'open_reader_mode', { bookmarkId: req.params.id });

  return res.json({
    reader: {
      bookmark_id: bookmark.id,
      url: bookmark.url,
      domain: bookmark.domain,
      title: bookmark.title,
      description: bookmark.description,
      image_url: bookmark.image_url,
      reading_status: bookmark.reading_status,
      readable_html: bookmark.readable_html || null,
      readable_text: bookmark.readable_text || null,
      byline: bookmark.byline || null,
      reading_time_mins: bookmark.reading_time_mins || 1,
      fetched_at: bookmark.fetched_at || null
    }
  });
});

// Update reading status (unread | reading | archived)
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['unread', 'reading', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Status must be unread, reading, or archived.' });
  }

  const db = getDb();
  const result = db.prepare(`
    UPDATE bookmarks
    SET reading_status = ?
    WHERE id = ? AND user_id = ?
  `).run(status, req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Bookmark not found.' });
  }

  logAudit(req.user.id, 'update_bookmark_status', { bookmarkId: req.params.id, status });
  return res.json({ success: true, message: `Status updated to ${status}.` });
});

// Delete bookmark
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Bookmark not found.' });
  }
  return res.json({ success: true, message: 'Bookmark deleted.' });
});

export default router;
