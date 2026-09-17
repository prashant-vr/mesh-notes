import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDefaultPrompts } from './seed.js';
import { setDbForLogger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export const initDb = (dbPath) => {
  if (db) return db;

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);

  // 8.1 Required Pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Install FTS sync triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_memos_insert AFTER INSERT ON memos
    BEGIN
      INSERT INTO unified_search_fts(user_id, entity_id, entity_type, title, content, article_text, tags)
      VALUES (new.user_id, new.id, 'memo', '', new.content, '', '');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_memos_delete AFTER DELETE ON memos
    BEGIN
      DELETE FROM unified_search_fts WHERE entity_id = old.id AND entity_type = 'memo';
    END;

    CREATE TRIGGER IF NOT EXISTS trg_memos_update AFTER UPDATE ON memos
    BEGIN
      DELETE FROM unified_search_fts WHERE entity_id = old.id AND entity_type = 'memo';
      INSERT INTO unified_search_fts(user_id, entity_id, entity_type, title, content, article_text, tags)
      VALUES (
        new.user_id,
        new.id,
        'memo',
        '',
        new.content,
        '',
        COALESCE((SELECT GROUP_CONCAT(t.name, ' ') FROM memo_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.memo_id = new.id), '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_bookmarks_insert AFTER INSERT ON bookmarks
    BEGIN
      INSERT INTO unified_search_fts(user_id, entity_id, entity_type, title, content, article_text, tags)
      VALUES (new.user_id, new.id, 'bookmark', COALESCE(new.title, ''), COALESCE(new.description, ''), '', '');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_bookmarks_delete AFTER DELETE ON bookmarks
    BEGIN
      DELETE FROM unified_search_fts WHERE entity_id = old.id AND entity_type = 'bookmark';
    END;

    CREATE TRIGGER IF NOT EXISTS trg_bookmarks_update AFTER UPDATE ON bookmarks
    BEGIN
      DELETE FROM unified_search_fts WHERE entity_id = old.id AND entity_type = 'bookmark';
      INSERT INTO unified_search_fts(user_id, entity_id, entity_type, title, content, article_text, tags)
      VALUES (
        new.user_id,
        new.id,
        'bookmark',
        COALESCE(new.title, ''),
        COALESCE(new.description, ''),
        COALESCE((SELECT readable_text FROM article_cache WHERE bookmark_id = new.id), ''),
        COALESCE((SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = new.id), '')
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_article_cache_insert AFTER INSERT ON article_cache
    BEGIN
      UPDATE unified_search_fts 
      SET article_text = new.readable_text 
      WHERE entity_id = new.bookmark_id AND entity_type = 'bookmark';
    END;

    CREATE TRIGGER IF NOT EXISTS trg_article_cache_update AFTER UPDATE ON article_cache
    BEGIN
      UPDATE unified_search_fts 
      SET article_text = new.readable_text 
      WHERE entity_id = new.bookmark_id AND entity_type = 'bookmark';
    END;
  `);

  setDbForLogger(db);
  seedDefaultPrompts(db);

  console.log(`[DB] Database initialized successfully at ${dbPath}`);
  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }
  return db;
};
