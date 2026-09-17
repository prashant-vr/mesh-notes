import express from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { discoverModels } from '../services/llm.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// Helper to mask API keys
const maskKey = (key) => {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}••••••••${key.slice(-4)}`;
};

// GET /api/llm/providers
router.get('/providers', (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  const providers = db.prepare(`
    SELECT id, user_id, label, base_url, api_key, created_at
    FROM llm_providers
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  const masked = providers.map(p => ({
    ...p,
    api_key_masked: maskKey(p.api_key),
    has_key: !!p.api_key
  }));

  return res.json({ providers: masked });
});

// POST /api/llm/providers
router.post('/providers', (req, res) => {
  const userId = req.user.id;
  const { label, base_url, api_key } = req.body;

  if (!label || !base_url) {
    return res.status(400).json({ error: 'Label and Base URL are required.' });
  }

  const cleanBaseUrl = base_url.trim().replace(/\/+$/, '');
  const id = crypto.randomUUID();
  const now = Date.now();
  const db = getDb();

  db.prepare(`
    INSERT INTO llm_providers (id, user_id, label, base_url, api_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, label.trim(), cleanBaseUrl, (api_key || '').trim(), now);

  logAudit(userId, 'create_llm_provider', { label });

  return res.status(201).json({
    provider: {
      id,
      label: label.trim(),
      base_url: cleanBaseUrl,
      api_key_masked: maskKey(api_key),
      created_at: now
    }
  });
});

// DELETE /api/llm/providers/:id
router.delete('/providers/:id', (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  const result = db.prepare('DELETE FROM llm_providers WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  return res.json({ success: true, message: 'Provider deleted.' });
});

// POST /api/llm/discover-models
router.post('/discover-models', async (req, res) => {
  let { base_url, api_key, provider_id } = req.body;
  const db = getDb();

  if (provider_id) {
    const p = db.prepare('SELECT * FROM llm_providers WHERE id = ? AND user_id = ?').get(provider_id, req.user.id);
    if (p) {
      base_url = p.base_url;
      api_key = p.api_key;
    }
  }

  if (!base_url) {
    return res.status(400).json({ error: 'Base URL or valid provider_id is required.' });
  }

  try {
    const models = await discoverModels(base_url, api_key);
    return res.json({ models });
  } catch (err) {
    console.error('[LLM] Discovery error:', err.message);
    return res.status(502).json({ error: err.message });
  }
});

// GET /api/llm/config
router.get('/config', (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  let config = db.prepare('SELECT * FROM llm_configurations WHERE user_id = ?').get(userId);
  if (!config) {
    config = {
      user_id: userId,
      default_generation_provider_id: null,
      default_generation_model: null,
      default_selection_provider_id: null,
      default_selection_model: null
    };
  }

  return res.json({ config });
});

// PUT /api/llm/config
router.put('/config', (req, res) => {
  const userId = req.user.id;
  const {
    default_generation_provider_id,
    default_generation_model,
    default_selection_provider_id,
    default_selection_model
  } = req.body;

  const db = getDb();
  db.prepare(`
    INSERT INTO llm_configurations (
      user_id, 
      default_generation_provider_id, 
      default_generation_model, 
      default_selection_provider_id, 
      default_selection_model
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      default_generation_provider_id = excluded.default_generation_provider_id,
      default_generation_model = excluded.default_generation_model,
      default_selection_provider_id = excluded.default_selection_provider_id,
      default_selection_model = excluded.default_selection_model
  `).run(
    userId,
    default_generation_provider_id || null,
    default_generation_model || null,
    default_selection_provider_id || null,
    default_selection_model || null
  );

  return res.json({ success: true, message: 'Default LLM configuration updated.' });
});

export default router;
