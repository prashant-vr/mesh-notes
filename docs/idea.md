# System Architecture & Technical Specification Document

**Project:** Open-Source Self-Hosted Notes & Bookmark Manager  
**Interface Inspiration:** Memos (`usememos/memos`) + Notion  
**Target Consumer:** Antigravity / Autonomous Coding Agent  

---

## 1. System Overview & Core Principles

The application is an open-source, local-first, privacy-focused knowledge hub combining note-taking, link archiving, and AI-assisted drafting. It rejects external browser extensions in favor of an in-app ingestion flow, an embedded distraction-free reader mode, a Notion-style navigation sidebar, and a Memos-style timeline/feed.

### Core Architectural Decisions:
1. **Decoupled Architecture:**
   * **Backend:** Headless REST API built on Node.js/TypeScript.
   * **Frontend:** Client-Side Single Page Application (SPA) built with Tailwind CSS and DaisyUI.
2. **Database Engine:** `better-sqlite3` (Embedded SQLite running in WAL mode with FTS5).
3. **Zero Browser Extensions:** Ingestion relies exclusively on direct URL parsing, smart clipboard pasting, batch import, and REST webhooks.
4. **Multi-Tenant with Long-Lived Sessions:** Support for user registration and Super Admin controls, secured via 1-year JWTs backed by database-level token versioning.
5. **Agnostic LLM Layer:** Bring-Your-Own-Key (BYOK) architecture compatible with any standard OpenAI-compatible API endpoint (OpenAI, Ollama, OpenRouter, Groq, vLLM, LocalAI) featuring live dynamic model discovery.

---

## 2. Technology Stack

* **Frontend:** Client-Side SPA (React, Svelte, or Vue), Tailwind CSS, DaisyUI (semantic themes and component primitives), TipTap / ProseMirror (rich-text markdown editor with floating bubble menus), Lucide Icons.
* **Backend:** Node.js (Fastify or Express in API-only mode).
* **Database Driver:** `better-sqlite3`.
* **Search Engine:** SQLite FTS5 with BM25 ranking algorithm and Porter Stemmer.
* **Scraping & Extraction Engine:** `@mozilla/readability` + `jsdom` (reader mode) and `open-graph-scraper` (metadata extraction).
* **Authentication:** JSON Web Tokens (JWT) with HMAC-SHA256, passwords hashed with Argon2id or bcrypt.

---

## 3. Authentication, Authorization & User Management

### 3.1 Role Hierarchy
* **Super Admin:** Can manage all system accounts, suspend/activate users, escalate roles, inspect system resource usage, and seed global default AI prompts.
* **Regular User:** Isolated environment; can only access and modify their own folders, notes, bookmarks, tags, settings, and private prompts.

### 3.2 1-Year JWT Architecture with Revocation
* **Token Lifetime:** 365 Days (`expiresIn: '365d'`).
* **Instant Revocation Strategy:**
  * The `users` table maintains an integer field: `token_version`.
  * The JWT payload encodes `{ userId, role, token_version }`.
  * The backend authentication middleware verifies the token signature and validates that `payload.token_version === db_user.token_version`.
  * An account suspension, password change, or explicit logout increments `token_version` by 1, instantly rendering all active 1-year tokens invalid across all devices.

---

## 4. UI Shell & Layout Specification (DaisyUI)

The UI adheres to a two-pane layout: a Notion-style persistent sidebar on the left and an expansive, distraction-free content canvas on the right.

### 4.1 Left Sidebar
* **Header:**
  * Workspace/App branding.
  * User profile button with avatar, displaying current user handle and a role badge.
  * Quick-find search bar (Shortcut: `Cmd/Ctrl + K`).
* **Quick Access Links:**
  * *All Memos/Stream* (Default view).
  * *Bookmarks Only* (Filtered link repository).
  * *Reading List* (Segmented into: Unread, In-Progress, Archived).
  * *Pinned / Favorites*.
* **Folders Section:**
  * Rendered using DaisyUI nested `menu` or collapsible `<details>` components.
  * Hierarchical/nested folder structure supporting infinite depth.
  * In-place `+` button on hover to create subfolders.
* **Tags Section:**
  * Tag cloud / list with counts parsed from `#tags` or explicitly assigned tags.
* **Filter & Sort Toolbar:**
  * Filter toggles: Notes vs. Bookmarks.
  * Sort dropdown: Newest First, Oldest First, Recently Updated, Alphabetical.
* **Bottom Persistent Utility Bar:**
  * **Log Button:** Navigates to or opens a modal/view displaying audit logs, background scraper tasks, extraction states, and system activity.
  * **Settings Button:** Routes to the main Settings Hub.

### 4.2 Main Content Canvas
* **Top Composer (Memos-Style):**
  * Auto-expanding textarea with Markdown support.
  * Magic paste listener: raw URLs automatically trigger an inline preview card.
  * Dedicated Action Buttons: Folder assignment, Tag picker, Visibility toggle (`private` vs `public`), and AI Generation trigger (`/ai`).
* **Content Stream / Timeline:**
  * Chronological list of memo cards.
  * Hybrid display: Notes displayed in Markdown; attached bookmarks rendered as rich metadata preview cards.
  * In-card triage actions: Mark as Read/Done, Toggle Pin, Edit, Delete.
* **In-Stream Reader Drawer:**
  * Implemented using DaisyUI `drawer drawer-end`.
  * Clicking "Read" on any bookmark slides out a distraction-free reader pane from the right edge.
  * Allows highlighting passages to immediately trigger selection-based AI prompts or quote extraction.

---

## 5. Settings Hub Architecture

Clicking the **Settings Button** in the sidebar bottom bar routes the user to a dedicated dashboard presenting high-level navigation cards.

```text
┌─────────────────────────────────────────────────────────────┐
│                       SETTINGS HUB                          │
│                                                             │
│  ┌───────────────────┐ ┌───────────────────┐ ┌────────────┐ │
│  │  Manage Account   │ │       Data        │ │ LLM Manage │ │
│  │                   │ │                   │ │            │ │
│  │ Profile, password │ │ Import, export,   │ │ Providers, │ │
│  │ sessions, admin.  │ │ backups, purge.   │ │ keys, model│ │
│  │                   │ │                   │ │ discovery. │ │
│  └───────────────────┘ └───────────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Card 1: Manage Account
* Profile detail configuration (Display Name, Email).
* Password update form (triggers `token_version` increment).
* Active session list with global logout capability.
* **Super Admin Control Panel (Visible strictly to Super Admins):**
  * User table displaying registered accounts, assigned roles, and registration dates.
  * Action controls: Suspend Account, Activate Account, Promote to Admin, Demote, Delete User.

### Card 2: Data Management
* **Import Engine:**
  * Upload browser bookmark exports (`bookmarks.html`).
  * Upload CSV / JSON archives.
  * Pocket / Raindrop / Omnivore migration parsers.
* **Export Engine:**
  * One-click complete export: Zipped directory containing plain Markdown files with YAML frontmatter + standard Netscape Bookmark HTML file.
* **Data Purge:** Hard-delete soft-deleted items, clear cached article text, or wipe account data.

### Card 3: LLM Manage (Multi-Provider, Multi-Key & Dynamic Discovery)
This module decouples the application from hardcoded AI vendors, adhering to standard OpenAI-compatible API specifications.

* **Multi-Provider & Multi-Key Support:**
  * A user can register multiple distinct providers (e.g., "Home Ollama", "Work OpenAI", "Groq Fast Inference", "OpenRouter").
  * A user can store **multiple API keys** under the same provider (e.g., testing personal vs. project keys).
* **Endpoint & Credential Form:**
  * `Provider Label` (Friendly name).
  * `API Base URL` (e.g., `https://api.openai.com/v1`, `http://localhost:11434/v1`, `https://openrouter.ai/api/v1`).
  * `API Key` (Securely stored per user).
* **Automated Dynamic Model Discovery:**
  * As soon as the user inputs/updates the API Base URL and Key, the client calls a backend proxy endpoint: `POST /api/llm/discover-models`.
  * The backend sends an authenticated `GET` request to the provider's standard endpoint: `${API_BASE_URL}/models`.
  * The returned JSON list of model objects (`data: [{ id: "model-name" }]`) is parsed and returned to the client.
* **Model Selection UI:**
  * The model selector transforms from a manual text input into a **Searchable DaisyUI Dropdown/Select** populated with all discovered models for that specific endpoint and key.
  * The user selects their preferred model (e.g., `llama3.2:latest`, `gpt-4o-mini`, `deepseek-chat`).
* **Default Configuration:**
  * The user can select which configured Provider + Key + Model tuple serves as the **Default Generation Model** and which serves as the **Default Transformation/Selection Model**.

---

## 6. AI Engine & Dynamic Prompt Management

The AI subsystem operates on two primary event channels:

### 6.1 Event Types
1. **Generation Event (Creating content from scratch):**
   * Triggered via `/ai` command inside the editor or clicking "Ask AI" in the composer.
   * Input: User prompt or selected generation template.
   * Output: Streamed directly into the active editor block.
2. **Selection Event (Transforming highlighted text):**
   * Triggered when the user highlights text inside a note or inside the Reader Mode drawer.
   * UI: A floating DaisyUI/TipTap Bubble Menu surfaces immediately above the selection.
   * Actions:
     * Predefined prompt chips (e.g., *Summarize*, *Fix Grammar*, *Extract Action Items*, *Explain*).
     * Custom instruction input field (e.g., *"Convert this list into a JSON schema"*).
   * Result Application: User can choose to `Replace Selection`, `Insert Below`, or `Copy to Clipboard`.

### 6.2 User-Defined Prompt Library
A dedicated configuration tab under Settings (and accessible from the composer) allows users to manage custom prompts:
* Users can view, create, edit, and delete their own prompt templates.
* Each prompt is scoped to an `event_type`: `'generation'` or `'selection'`.
* Prompts support dynamic templating tokens:
  * `{{input}}`: The highlighted text or user argument.
  * `{{context}}`: The surrounding note or full article content.
* Super Admins can define global default prompts accessible to all platform users.
* Streaming responses are delivered via Server-Sent Events (SSE) for low-latency feedback.

---

## 7. Ingestion & In-App Reader Architecture

Because browser extensions are explicitly excluded, capturing links must be entirely seamless:

### 7.1 Ingestion Flow
1. **URL Detection:** When a URL is entered into the composer or note body, the frontend posts it to `/api/memos`.
2. **Asynchronous Unfurl Pipeline:**
   * Backend fetches the target web page headers and HTML.
   * Runs OpenGraph scraper to extract: `title`, `description`, `image_url`, `favicon`, `canonical_url`, and `domain`.
   * Runs `@mozilla/readability` inside a virtual DOM environment (`jsdom`) to extract clean, ad-free article text and sanitised HTML.
3. **Database Insertion:**
   * Saves link metadata into `bookmarks`.
   * Saves clean article text into `article_cache`.
   * Automatically updates SQLite FTS5 search index tables via triggers.

---

## 8. Database Architecture (`better-sqlite3`)

### 8.1 Required Pragmas
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
```

### 8.2 Entity-Relationship Schema Blueprint

```sql
-- 1. USERS & SECURITY
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'admin', 'superadmin')) DEFAULT 'user',
  status TEXT CHECK(status IN ('active', 'suspended')) DEFAULT 'active',
  token_version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. HIERARCHICAL FOLDERS
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL
);

-- 3. MEMOS / NOTES
CREATE TABLE memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  pinned INTEGER DEFAULT 0,
  visibility TEXT CHECK(visibility IN ('public', 'private')) DEFAULT 'private',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 4. BOOKMARKS
CREATE TABLE bookmarks (
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

-- 5. ARTICLE READABILITY CACHE
CREATE TABLE article_cache (
  bookmark_id TEXT PRIMARY KEY REFERENCES bookmarks(id) ON DELETE CASCADE,
  readable_html TEXT,
  readable_text TEXT,
  byline TEXT,
  reading_time_mins INTEGER,
  fetched_at INTEGER NOT NULL
);

-- 6. TAGS & JUNCTIONS
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE memo_tags (
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (memo_id, tag_id)
);

CREATE TABLE bookmark_tags (
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, tag_id)
);

-- 7. LLM PROVIDERS & KEYS
CREATE TABLE llm_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE llm_configurations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_generation_provider_id TEXT REFERENCES llm_providers(id) ON DELETE SET NULL,
  default_generation_model TEXT,
  default_selection_provider_id TEXT REFERENCES llm_providers(id) ON DELETE SET NULL,
  default_selection_model TEXT
);

-- 8. CUSTOM AI PROMPT TEMPLATES
CREATE TABLE ai_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE, -- NULL indicates system-wide default
  title TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('generation', 'selection')) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  is_favorite INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

---

## 9. Search Engine Specification (SQLite FTS5 + BM25)

Search must query personal notes, bookmark metadata, tags, and full cached article texts in a unified, rank-sorted index.

### 9.1 FTS5 Index Configuration
```sql
CREATE VIRTUAL TABLE unified_search_fts USING fts5(
  user_id UNINDEXED,
  entity_id UNINDEXED,
  entity_type UNINDEXED, -- 'memo' | 'bookmark'
  title,
  content,
  article_text,
  tags,
  tokenize = 'porter unicode61 remove_diacritics 2'
);
```

### 9.2 Synchronization Triggers
SQLite triggers automatically sync FTS tables upon insertions, updates, or deletions of `memos`, `bookmarks`, and `tags`, eliminating out-of-sync states.

### 9.3 Ranking & Scoring Standard
* Ranking utilizes SQLite's internal `bm25()` function with column weights:
  * **Title:** Weight `5.0`
  * **Tags:** Weight `4.0`
  * **Content (Note Body / Description):** Weight `3.0`
  * **Article Text (Cached Webpage):** Weight `1.0`
* Snippet generation wraps matching terms inside:
  `<mark class="bg-warning text-warning-content rounded px-1">` for direct, unescaped rendering in DaisyUI cards.

---

## 10. REST API Specification

### 10.1 Authentication & Profile
* `POST /api/auth/register` — Create initial account.
* `POST /api/auth/login` — Returns `{ token, user }`. Token valid for 365 days.
* `GET  /api/auth/me` — Retrieve current user context and permissions.
* `POST /api/auth/logout` — Increments `token_version`, invalidating active sessions.

### 10.2 Super Admin Endpoints (`/api/admin/*`)
* `GET   /api/admin/users` — List all registered users, roles, and status flags.
* `PATCH /api/admin/users/:id/status` — Modify account status (`active` | `suspended`).
* `PATCH /api/admin/users/:id/role` — Modify role (`user` | `admin`).
* `DELETE/api/admin/users/:id` — Delete account and cascade associated data.

### 10.3 Core Memos & Bookmarks
* `GET    /api/memos` — Query parameter filters: `folder_id`, `tag`, `type`, `reading_status`, `sort`, `search`.
* `POST   /api/memos` — Ingest note; runs URL unfurling and readability parser if link is detected.
* `PATCH  /api/memos/:id` — Update text content, folder placement, or pin status.
* `DELETE /api/memos/:id` — Delete memo and cascade attached bookmarks/cache.
* `GET    /api/bookmarks/:id/reader` — Returns clean `readable_html` for in-stream reading drawer.

### 10.4 Hierarchical Folders & Tags
* `GET    /api/folders` — Returns folder hierarchy tree.
* `POST   /api/folders` — Create folder with optional `parent_id`.
* `PATCH  /api/folders/:id` — Rename or move folder.
* `DELETE /api/folders/:id` — Remove folder (cascade or orphaned option).
* `GET    /api/tags` — List distinct tags with associated usage counts.

### 10.5 LLM Management & Dynamic Discovery
* `GET    /api/llm/providers` — List configured providers and keys.
* `POST   /api/llm/providers` — Store a new provider endpoint and key.
* `DELETE /api/llm/providers/:id` — Remove an LLM provider key entry.
* `POST   /api/llm/discover-models` — Accepts `{ base_url, api_key }`, calls `${base_url}/models`, returns array of discovered model ID strings.
* `GET    /api/llm/config` — Get active default models for generation and selection events.
* `PUT    /api/llm/config` — Update default provider/model assignments.

### 10.6 AI Execution & Prompts
* `GET    /api/ai/prompts` — Fetch accessible prompts (scoped to user + system defaults).
* `POST   /api/ai/prompts` — Create custom user prompt template.
* `POST   /api/ai/stream` — Accepts `{ provider_id, model, event_type, prompt_id, custom_instruction, selected_text, context_text }`. Streams the response using Server-Sent Events (`text/event-stream`).

### 10.7 Audit Logs
* `GET    /api/logs` — Paginated system logs (background fetch jobs, scraper successes/failures, auth events).

---

## 11. Implementation Directives for the Coding Agent

1. **Strict Decoupling:** Keep backend completely headless. Serve static frontend assets independently or statically via the backend in production mode.
2. **Synchronous DB Workflows:** Exploit `better-sqlite3`'s synchronous nature for straightforward, race-condition-free database transactions without complex connection pool boilerplate.
3. **Graceful Scraper Fallbacks:** If a target URL blocks scraping (e.g., Cloudflare challenges), the app must gracefully save the raw link and metadata card without breaking the memo creation transaction.
4. **Resilient AI Calling:** The `/api/llm/discover-models` route must incorporate a timeout (e.g., 5 seconds) to prevent hanging the UI when probing unreachable local network URLs (e.g., an offline local Ollama instance).