import crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { getDb } from '../db/index.js';
import { fetchUrlMetadata } from './scraper.js';
import { logAudit, logInfo } from '../utils/logger.js';

export const importNetscapeBookmarks = async (userId, htmlContent) => {
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;
  const links = doc.querySelectorAll('a');
  const db = getDb();

  let importedCount = 0;
  logInfo(`[Import] Found ${links.length} links in Netscape bookmark file for user ${userId}`);

  for (const link of links) {
    const url = link.getAttribute('href');
    if (!url || !url.startsWith('http')) continue;

    const title = link.textContent.trim() || url;
    const addDate = link.getAttribute('add_date') 
      ? parseInt(link.getAttribute('add_date'), 10) * 1000 
      : Date.now();
    const tagAttr = link.getAttribute('tags') || '';
    const tags = tagAttr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    // Create memo and bookmark
    const memoId = crypto.randomUUID();
    const bookmarkId = crypto.randomUUID();
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch (_) {
      domain = 'external';
    }

    db.prepare(`
      INSERT INTO memos (id, user_id, folder_id, content, pinned, visibility, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 0, 'private', ?, ?)
    `).run(memoId, userId, `${title}\n\n${url}`, addDate, addDate);

    db.prepare(`
      INSERT INTO bookmarks (id, user_id, memo_id, url, domain, title, description, image_url, favicon, reading_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unread', ?)
    `).run(bookmarkId, userId, memoId, url, domain, title, '', addDate);

    // Handle tags
    for (const tagName of tags) {
      let tag = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(userId, tagName);
      if (!tag) {
        const newTagId = crypto.randomUUID();
        db.prepare('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)').run(newTagId, userId, tagName);
        tag = { id: newTagId };
      }
      db.prepare('INSERT OR IGNORE INTO memo_tags (memo_id, tag_id) VALUES (?, ?)').run(memoId, tag.id);
      db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(bookmarkId, tag.id);
    }

    importedCount++;
  }

  logAudit(userId, 'import_netscape_bookmarks', { totalImported: importedCount });
  return { success: true, importedCount };
};

export const importJsonArchive = (userId, jsonData) => {
  const db = getDb();
  let memoCount = 0;

  const memos = Array.isArray(jsonData) ? jsonData : jsonData.memos || [];

  const runImport = db.transaction(() => {
    for (const item of memos) {
      const memoId = crypto.randomUUID();
      const content = item.content || item.note || item.title || '';
      const createdAt = item.created_at || Date.now();
      const pinned = item.pinned ? 1 : 0;
      const visibility = item.visibility === 'public' ? 'public' : 'private';

      db.prepare(`
        INSERT INTO memos (id, user_id, folder_id, content, pinned, visibility, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
      `).run(memoId, userId, content, pinned, visibility, createdAt, createdAt);

      // Bookmark if present
      if (item.url) {
        const bookmarkId = crypto.randomUUID();
        let domain = '';
        try {
          domain = new URL(item.url).hostname.replace(/^www\./, '');
        } catch (_) {
          domain = 'external';
        }
        db.prepare(`
          INSERT INTO bookmarks (id, user_id, memo_id, url, domain, title, description, image_url, favicon, reading_status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          bookmarkId,
          userId,
          memoId,
          item.url,
          domain,
          item.title || domain,
          item.description || '',
          item.image_url || null,
          item.favicon || null,
          item.reading_status || 'unread',
          createdAt
        );
      }

      // Tags
      if (Array.isArray(item.tags)) {
        for (const tagName of item.tags) {
          const cleanName = String(tagName).trim().toLowerCase();
          if (!cleanName) continue;
          let tag = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(userId, cleanName);
          if (!tag) {
            const newTagId = crypto.randomUUID();
            db.prepare('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)').run(newTagId, userId, cleanName);
            tag = { id: newTagId };
          }
          db.prepare('INSERT OR IGNORE INTO memo_tags (memo_id, tag_id) VALUES (?, ?)').run(memoId, tag.id);
        }
      }

      memoCount++;
    }
  });

  runImport();
  logAudit(userId, 'import_json_archive', { totalImported: memoCount });
  return { success: true, memoCount };
};

export const importCsvData = (userId, csvText) => {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return { success: true, importedCount: 0 };

  const db = getDb();
  let count = 0;

  // Simple CSV line parser handling quotes
  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const header = parseLine(lines[0]).map(h => h.toLowerCase());
  const urlIdx = header.findIndex(h => h.includes('url') || h.includes('link'));
  const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
  const noteIdx = header.findIndex(h => h.includes('note') || h.includes('content') || h.includes('description'));
  const tagsIdx = header.findIndex(h => h.includes('tag'));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const url = urlIdx !== -1 ? cols[urlIdx] : null;
    const title = titleIdx !== -1 ? cols[titleIdx] : '';
    const note = noteIdx !== -1 ? cols[noteIdx] : '';
    const tagsStr = tagsIdx !== -1 ? cols[tagsIdx] : '';

    if (!url && !title && !note) continue;

    const content = note || title || url;
    const memoId = crypto.randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT INTO memos (id, user_id, folder_id, content, pinned, visibility, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 0, 'private', ?, ?)
    `).run(memoId, userId, content, now, now);

    if (url && url.startsWith('http')) {
      let domain = '';
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch (_) {
        domain = 'external';
      }
      db.prepare(`
        INSERT INTO bookmarks (id, user_id, memo_id, url, domain, title, description, image_url, favicon, reading_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unread', ?)
      `).run(crypto.randomUUID(), userId, memoId, url, domain, title || domain, note, now);
    }

    if (tagsStr) {
      const tags = tagsStr.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean);
      for (const t of tags) {
        let tag = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(userId, t);
        if (!tag) {
          const newTagId = crypto.randomUUID();
          db.prepare('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)').run(newTagId, userId, t);
          tag = { id: newTagId };
        }
        db.prepare('INSERT OR IGNORE INTO memo_tags (memo_id, tag_id) VALUES (?, ?)').run(memoId, tag.id);
      }
    }

    count++;
  }

  logAudit(userId, 'import_csv_archive', { totalImported: count });
  return { success: true, count };
};
