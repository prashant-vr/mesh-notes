-- Core Pragmas are executed in db/index.js:
-- PRAGMA journal_mode = WAL;
-- PRAGMA foreign_keys = ON;
-- PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'admin', 'superadmin')) DEFAULT 'user',
  status TEXT CHECK(status IN ('active', 'suspended')) DEFAULT 'active',
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  verification_token_expires_at INTEGER,
  token_version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  pinned INTEGER DEFAULT 0,
  visibility TEXT CHECK(visibility IN ('public', 'private')) DEFAULT 'private',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  favicon TEXT,
  reading_status TEXT CHECK(reading_status IN ('unread', 'reading', 'archived')) DEFAULT 'unread',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS article_cache (
  bookmark_id TEXT PRIMARY KEY REFERENCES bookmarks(id) ON DELETE CASCADE,
  readable_html TEXT,
  readable_text TEXT,
  byline TEXT,
  reading_time_mins INTEGER,
  fetched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS memo_tags (
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (memo_id, tag_id)
);

CREATE TABLE IF NOT EXISTS bookmark_tags (
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, tag_id)
);

CREATE TABLE IF NOT EXISTS llm_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_configurations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_generation_provider_id TEXT REFERENCES llm_providers(id) ON DELETE SET NULL,
  default_generation_model TEXT,
  default_selection_provider_id TEXT REFERENCES llm_providers(id) ON DELETE SET NULL,
  default_selection_model TEXT
);

CREATE TABLE IF NOT EXISTS ai_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('generation', 'selection')) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  is_favorite INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'success',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memo_shares (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type TEXT CHECK(share_type IN ('public', 'views_limit', 'password')) NOT NULL,
  password_hash TEXT,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Unified FTS5 Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS unified_search_fts USING fts5(
  user_id UNINDEXED,
  entity_id UNINDEXED,
  entity_type UNINDEXED,
  title,
  content,
  article_text,
  tags,
  tokenize = 'porter unicode61 remove_diacritics 2'
);
