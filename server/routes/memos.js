import express from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { extractUrlFromText, fetchUrlMetadata } from '../services/scraper.js';
import { searchUnified } from '../services/search.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// Parse tags from markdown text: #tag or #multi_word_tag
const parseHashtags = (text) => {
  if (!text) return [];
  const matches = text.match(/#([\p{L}\p{N}_-]+)/gu) || [];
  return matches.map(m => m.slice(1).toLowerCase());
};

// Sync tags for a memo
const syncMemoTags = (db, userId, memoId, tagNames = []) => {
  // Remove existing
  db.prepare('DELETE FROM memo_tags WHERE memo_id = ?').run(memoId);

  const cleanTags = [...new Set(tagNames.map(t => t.trim().toLowerCase()).filter(Boolean))];
  for (const name of cleanTags) {
    let tag = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(userId, name);
    if (!tag) {
      const newTagId = crypto.randomUUID();
      db.prepare('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)').run(newTagId, userId, name);
      tag = { id: newTagId };
    }
    db.prepare('INSERT OR IGNORE INTO memo_tags (memo_id, tag_id) VALUES (?, ?)').run(memoId, tag.id);
  }
};

// GET /api/memos
router.get('/', (req, res) => {
  const userId = req.user.id;
  const {
    folder_id,
    tag,
    type,
    reading_status,
    pinned,
    sort = 'newest',
    search,
    limit = 50,
    offset = 0
  } = req.query;

  // Search query takes precedence using FTS5 BM25
  if (search && search.trim()) {
    const searchResults = searchUnified(userId, search.trim(), { limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
    return res.json({ memos: searchResults });
  }

  const db = getDb();
  let whereClauses = ['m.user_id = ?'];
  const params = [userId];

  if (folder_id === 'unorganized') {
    whereClauses.push('m.folder_id IS NULL');
  } else if (folder_id) {
    whereClauses.push('m.folder_id = ?');
    params.push(folder_id);
  }

  if (pinned === 'true') {
    whereClauses.push('m.pinned = 1');
  }

  if (type === 'bookmark') {
    whereClauses.push('EXISTS (SELECT 1 FROM bookmarks b WHERE b.memo_id = m.id)');
  } else if (type === 'note') {
    whereClauses.push('NOT EXISTS (SELECT 1 FROM bookmarks b WHERE b.memo_id = m.id)');
  }

  if (reading_status) {
    whereClauses.push('EXISTS (SELECT 1 FROM bookmarks b WHERE b.memo_id = m.id AND b.reading_status = ?)');
    params.push(reading_status);
  }

  if (tag) {
    whereClauses.push(`
      EXISTS (
        SELECT 1 FROM memo_tags mt 
        JOIN tags t ON mt.tag_id = t.id 
        WHERE mt.memo_id = m.id AND t.name = ?
      )
    `);
    params.push(tag.toLowerCase().trim());
  }

  let orderBy = 'm.pinned DESC, m.created_at DESC';
  if (sort === 'oldest') {
    orderBy = 'm.pinned DESC, m.created_at ASC';
  } else if (sort === 'updated') {
    orderBy = 'm.pinned DESC, m.updated_at DESC';
  }

  const query = `
    SELECT 
      m.*,
      f.name as folder_name,
      f.color as folder_color,
      b.id as bookmark_id,
      b.url as bookmark_url,
      b.domain as bookmark_domain,
      b.title as bookmark_title,
      b.description as bookmark_description,
      b.image_url as bookmark_image_url,
      b.favicon as bookmark_favicon,
      b.reading_status as bookmark_reading_status,
      (SELECT COUNT(*) FROM article_cache ac WHERE ac.bookmark_id = b.id) as has_reader_cache
    FROM memos m
    LEFT JOIN folders f ON m.folder_id = f.id
    LEFT JOIN bookmarks b ON b.memo_id = m.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const rows = db.prepare(query).all(...params);

    // Fetch tags for these memos
    const memoIds = rows.map(r => r.id);
    const tagMap = {};

    if (memoIds.length > 0) {
      const placeholders = memoIds.map(() => '?').join(',');
      const tagRows = db.prepare(`
        SELECT mt.memo_id, t.id, t.name
        FROM memo_tags mt
        JOIN tags t ON mt.tag_id = t.id
        WHERE mt.memo_id IN (${placeholders})
      `).all(...memoIds);

      for (const t of tagRows) {
        if (!tagMap[t.memo_id]) tagMap[t.memo_id] = [];
        tagMap[t.memo_id].push({ id: t.id, name: t.name });
      }
    }

    const results = rows.map(r => {
      const memo = {
        id: r.id,
        user_id: r.user_id,
        folder_id: r.folder_id,
        folder_name: r.folder_name,
        folder_color: r.folder_color,
        content: r.content,
        pinned: r.pinned === 1,
        visibility: r.visibility,
        created_at: r.created_at,
        updated_at: r.updated_at,
        tags: tagMap[r.id] || []
      };

      if (r.bookmark_id) {
        memo.bookmark = {
          id: r.bookmark_id,
          memo_id: r.id,
          url: r.bookmark_url,
          domain: r.bookmark_domain,
          title: r.bookmark_title,
          description: r.bookmark_description,
          image_url: r.bookmark_image_url,
          favicon: r.bookmark_favicon,
          reading_status: r.bookmark_reading_status,
          has_reader_cache: r.has_reader_cache > 0
        };
      } else {
        memo.bookmark = null;
      }

      return memo;
    });

    return res.json({ memos: results });
  } catch (err) {
    console.error('[Memos] List error:', err);
    return res.status(500).json({ error: 'Failed to retrieve memos.' });
  }
});

// POST /api/memos
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { content, folder_id, visibility = 'private', tags = [] } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Memo content cannot be empty.' });
  }

  const db = getDb();
  const memoId = crypto.randomUUID();
  const now = Date.now();

  try {
    // Insert memo
    db.prepare(`
      INSERT INTO memos (id, user_id, folder_id, content, pinned, visibility, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).run(memoId, userId, folder_id || null, content.trim(), visibility, now, now);

    // Parse and link tags
    const embeddedTags = parseHashtags(content);
    const combinedTags = [...new Set([...tags, ...embeddedTags])];
    syncMemoTags(db, userId, memoId, combinedTags);

    // Check for URL in content
    const detectedUrl = extractUrlFromText(content);
    let bookmark = null;

    if (detectedUrl) {
      try {
        const metadata = await fetchUrlMetadata(detectedUrl, userId);
        if (metadata) {
          const bookmarkId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO bookmarks (id, user_id, memo_id, url, domain, title, description, image_url, favicon, reading_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?)
          `).run(
            bookmarkId,
            userId,
            memoId,
            metadata.url,
            metadata.domain,
            metadata.title,
            metadata.description,
            metadata.image_url,
            metadata.favicon,
            now
          );

          if (metadata.readable_html || metadata.readable_text) {
            db.prepare(`
              INSERT INTO article_cache (bookmark_id, readable_html, readable_text, byline, reading_time_mins, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              bookmarkId,
              metadata.readable_html,
              metadata.readable_text,
              metadata.byline,
              metadata.reading_time_mins,
              now
            );
          }

          bookmark = {
            id: bookmarkId,
            memo_id: memoId,
            url: metadata.url,
            domain: metadata.domain,
            title: metadata.title,
            description: metadata.description,
            image_url: metadata.image_url,
            favicon: metadata.favicon,
            reading_status: 'unread',
            has_reader_cache: !!metadata.readable_html
          };
        }
      } catch (scrapeErr) {
        console.error('[Memos] Scrape unfurl warning (non-fatal):', scrapeErr.message);
      }
    }

    logAudit(userId, 'create_memo', { memoId, hasBookmark: !!bookmark });

    return res.status(201).json({
      memo: {
        id: memoId,
        user_id: userId,
        folder_id: folder_id || null,
        content: content.trim(),
        pinned: false,
        visibility,
        created_at: now,
        updated_at: now,
        tags: combinedTags.map(t => ({ name: t })),
        bookmark
      }
    });
  } catch (err) {
    console.error('[Memos] Create memo error:', err);
    return res.status(500).json({ error: 'Failed to create memo.' });
  }
});

// GET /api/memos/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const memo = db.prepare(`
    SELECT m.*, f.name as folder_name, f.color as folder_color
    FROM memos m
    LEFT JOIN folders f ON m.folder_id = f.id
    WHERE m.id = ? AND m.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!memo) {
    return res.status(404).json({ error: 'Memo not found.' });
  }

  const tags = db.prepare(`
    SELECT t.id, t.name
    FROM memo_tags mt
    JOIN tags t ON mt.tag_id = t.id
    WHERE mt.memo_id = ?
  `).all(memo.id);

  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE memo_id = ?').get(memo.id);

  return res.json({
    memo: {
      ...memo,
      pinned: memo.pinned === 1,
      tags,
      bookmark: bookmark || null
    }
  });
});

// PATCH /api/memos/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const memoId = req.params.id;
  const { content, folder_id, pinned, visibility, tags } = req.body;

  const existing = db.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ?').get(memoId, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Memo not found.' });
  }

  const newContent = content !== undefined ? content : existing.content;
  const newFolderId = folder_id !== undefined ? folder_id : existing.folder_id;
  const newPinned = pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned;
  const newVisibility = visibility !== undefined ? visibility : existing.visibility;
  const now = Date.now();

  db.prepare(`
    UPDATE memos
    SET content = ?, folder_id = ?, pinned = ?, visibility = ?, updated_at = ?
    WHERE id = ?
  `).run(newContent, newFolderId, newPinned, newVisibility, now, memoId);

  if (tags !== undefined || content !== undefined) {
    const embedded = parseHashtags(newContent);
    const finalTags = tags !== undefined ? [...new Set([...tags, ...embedded])] : embedded;
    syncMemoTags(db, userId, memoId, finalTags);
  }

  logAudit(userId, 'update_memo', { memoId });
  return res.json({ success: true, message: 'Memo updated successfully.' });
});

// DELETE /api/memos/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM memos WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Memo not found.' });
  }
  logAudit(req.user.id, 'delete_memo', { memoId: req.params.id });
  return res.json({ success: true, message: 'Memo deleted.' });
});

export default router;
