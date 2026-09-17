import { getDb } from '../db/index.js';

export const sanitizeFtsQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  // Remove fts5 special operators if raw, or preserve tokens
  const clean = query.replace(/[^\p{L}\p{N}\s"-]/gu, ' ').trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  // Add prefix match * for token searching
  return tokens.map(t => t.includes('"') ? t : `${t}*`).join(' ');
};

export const searchUnified = (userId, rawQuery, options = {}) => {
  const db = getDb();
  const ftsQuery = sanitizeFtsQuery(rawQuery);
  if (!ftsQuery) return [];

  const limit = options.limit || 30;
  const offset = options.offset || 0;

  // BM25 weights: title:5.0, content:3.0, article_text:1.0, tags:4.0
  // In unified_search_fts:
  // Col 0: title
  // Col 1: content
  // Col 2: article_text
  // Col 3: tags
  // Note: bm25(unified_search_fts, 5.0, 3.0, 1.0, 4.0)
  try {
    const stmt = db.prepare(`
      SELECT 
        fts.entity_id,
        fts.entity_type,
        fts.title,
        fts.content,
        fts.tags,
        bm25(unified_search_fts, 5.0, 3.0, 1.0, 4.0) as rank,
        snippet(unified_search_fts, 4, '<mark class="bg-warning text-warning-content rounded px-1">', '</mark>', '...', 25) as content_snippet,
        snippet(unified_search_fts, 5, '<mark class="bg-warning text-warning-content rounded px-1">', '</mark>', '...', 25) as article_snippet
      FROM unified_search_fts fts
      WHERE fts.user_id = ? AND unified_search_fts MATCH ?
      ORDER BY rank ASC
      LIMIT ? OFFSET ?
    `);

    const results = stmt.all(userId, ftsQuery, limit, offset);

    // Hydrate results with full entity details
    return results.map(row => {
      if (row.entity_type === 'memo') {
        const memo = db.prepare(`
          SELECT m.*, f.name as folder_name, f.color as folder_color
          FROM memos m
          LEFT JOIN folders f ON m.folder_id = f.id
          WHERE m.id = ?
        `).get(row.entity_id);

        if (!memo) return null;

        const tags = db.prepare(`
          SELECT t.id, t.name
          FROM memo_tags mt
          JOIN tags t ON mt.tag_id = t.id
          WHERE mt.memo_id = ?
        `).all(row.entity_id);

        const bookmark = db.prepare(`
          SELECT * FROM bookmarks WHERE memo_id = ?
        `).get(row.entity_id);

        return {
          ...row,
          entity: {
            ...memo,
            tags,
            bookmark: bookmark || null
          }
        };
      } else if (row.entity_type === 'bookmark') {
        const bookmark = db.prepare(`
          SELECT b.*, m.content as memo_content, m.folder_id
          FROM bookmarks b
          JOIN memos m ON b.memo_id = m.id
          WHERE b.id = ?
        `).get(row.entity_id);

        if (!bookmark) return null;

        const tags = db.prepare(`
          SELECT t.id, t.name
          FROM bookmark_tags bt
          JOIN tags t ON bt.tag_id = t.id
          WHERE bt.bookmark_id = ?
        `).all(row.entity_id);

        return {
          ...row,
          entity: {
            ...bookmark,
            tags
          }
        };
      }
      return row;
    }).filter(Boolean);
  } catch (err) {
    console.error('[FTS_SEARCH_ERROR]', err.message);
    return [];
  }
};
