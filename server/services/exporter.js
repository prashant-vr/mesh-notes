import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { getDb } from '../db/index.js';
import { logAudit } from '../utils/logger.js';

export const exportUserDataAsZip = (userId, res) => {
  const db = getDb();

  const memos = db.prepare(`
    SELECT m.*, f.name as folder_name 
    FROM memos m 
    LEFT JOIN folders f ON m.folder_id = f.id 
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
  `).all(userId);

  const bookmarks = db.prepare(`
    SELECT b.*, ac.readable_text, ac.byline
    FROM bookmarks b
    LEFT JOIN article_cache ac ON b.id = ac.bookmark_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);

  const tags = db.prepare(`
    SELECT t.name, mt.memo_id
    FROM memo_tags mt
    JOIN tags t ON mt.tag_id = t.id
    WHERE t.user_id = ?
  `).all(userId);

  const tagMap = {};
  for (const row of tags) {
    if (!tagMap[row.memo_id]) tagMap[row.memo_id] = [];
    tagMap[row.memo_id].push(row.name);
  }

  // Generate Netscape Bookmarks HTML
  let netscapeHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. It will be read and overwritten. Do Not Edit! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  for (const b of bookmarks) {
    const addDate = Math.floor(b.created_at / 1000);
    const title = (b.title || b.url).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    netscapeHtml += `    <DT><A HREF="${b.url}" ADD_DATE="${addDate}">${title}</A>\n`;
    if (b.description) {
      netscapeHtml += `    <DD>${b.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}\n`;
    }
  }
  netscapeHtml += `</DL><p>\n`;

  // Initialize zip archive
  const archive = typeof archiver === 'function' 
    ? archiver('zip', { zlib: { level: 9 } })
    : new archiver.ZipArchive({ zlib: { level: 9 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="mesh-notes-export-${new Date().toISOString().slice(0, 10)}.zip"`);

  archive.pipe(res);

  // 1. Add Netscape HTML
  archive.append(netscapeHtml, { name: 'bookmarks.html' });

  // 2. Add individual Markdown files with YAML frontmatter
  for (const m of memos) {
    const mTags = tagMap[m.id] || [];
    const dateStr = new Date(m.created_at).toISOString();
    const folder = m.folder_name ? m.folder_name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'unorganized';

    const frontmatter = [
      '---',
      `id: "${m.id}"`,
      `date: "${dateStr}"`,
      `pinned: ${m.pinned === 1}`,
      `visibility: "${m.visibility}"`,
      `folder: "${m.folder_name || ''}"`,
      `tags: [${mTags.map(t => `"${t}"`).join(', ')}]`,
      '---',
      '',
      m.content
    ].join('\n');

    const sanitizedTitle = m.content.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_') || 'memo';
    const filename = `memos/${folder}/${sanitizedTitle}-${m.id.slice(0, 8)}.md`;
    archive.append(frontmatter, { name: filename });
  }

  // 3. Add Raw JSON export
  const fullJson = {
    exported_at: new Date().toISOString(),
    memos: memos.map(m => ({ ...m, tags: tagMap[m.id] || [] })),
    bookmarks
  };
  archive.append(JSON.stringify(fullJson, null, 2), { name: 'mesh-notes-backup.json' });

  archive.finalize();
  logAudit(userId, 'export_data_archive', { memosCount: memos.length, bookmarksCount: bookmarks.length });
};
