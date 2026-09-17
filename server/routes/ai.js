import express from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { streamChatCompletion } from '../services/llm.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// GET /api/ai/prompts (user prompts + system defaults)
router.get('/prompts', (req, res) => {
  const userId = req.user.id;
  const { event_type } = req.query;
  const db = getDb();

  let query = `
    SELECT * FROM ai_prompts 
    WHERE (user_id = ? OR user_id IS NULL)
  `;
  const params = [userId];

  if (event_type) {
    query += ' AND event_type = ?';
    params.push(event_type);
  }

  query += ' ORDER BY is_favorite DESC, created_at DESC';

  const prompts = db.prepare(query).all(...params);
  return res.json({ prompts });
});

// POST /api/ai/prompts
router.post('/prompts', (req, res) => {
  const userId = req.user.id;
  const { title, event_type, system_prompt, user_prompt_template, is_favorite = 0 } = req.body;

  if (!title || !event_type || !user_prompt_template) {
    return res.status(400).json({ error: 'Title, event_type, and user_prompt_template are required.' });
  }

  if (!['generation', 'selection'].includes(event_type)) {
    return res.status(400).json({ error: 'event_type must be generation or selection.' });
  }

  const id = crypto.randomUUID();
  const db = getDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO ai_prompts (id, user_id, title, event_type, system_prompt, user_prompt_template, is_favorite, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title.trim(), event_type, (system_prompt || '').trim(), user_prompt_template.trim(), is_favorite ? 1 : 0, now);

  return res.status(201).json({
    prompt: {
      id,
      user_id: userId,
      title: title.trim(),
      event_type,
      system_prompt: system_prompt || '',
      user_prompt_template: user_prompt_template.trim(),
      is_favorite: is_favorite ? 1 : 0,
      created_at: now
    }
  });
});

// PATCH /api/ai/prompts/:id
router.patch('/prompts/:id', (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, system_prompt, user_prompt_template, is_favorite } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM ai_prompts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Prompt not found.' });
  }

  // System defaults cannot be edited by normal users unless superadmin
  if (existing.user_id === null && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Cannot modify system default prompt.' });
  }

  if (existing.user_id && existing.user_id !== userId) {
    return res.status(403).json({ error: 'Not authorized to modify this prompt.' });
  }

  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newSystem = system_prompt !== undefined ? system_prompt : existing.system_prompt;
  const newTemplate = user_prompt_template !== undefined ? user_prompt_template : existing.user_prompt_template;
  const newFav = is_favorite !== undefined ? (is_favorite ? 1 : 0) : existing.is_favorite;

  db.prepare(`
    UPDATE ai_prompts
    SET title = ?, system_prompt = ?, user_prompt_template = ?, is_favorite = ?
    WHERE id = ?
  `).run(newTitle, newSystem, newTemplate, newFav, id);

  return res.json({ success: true, message: 'Prompt updated.' });
});

// DELETE /api/ai/prompts/:id
router.delete('/prompts/:id', (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM ai_prompts WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Prompt not found.' });
  }

  if (existing.user_id === null && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Cannot delete system default prompt.' });
  }

  if (existing.user_id && existing.user_id !== userId) {
    return res.status(403).json({ error: 'Not authorized.' });
  }

  db.prepare('DELETE FROM ai_prompts WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Prompt deleted.' });
});

// POST /api/ai/stream (SSE streaming)
router.post('/stream', async (req, res) => {
  const userId = req.user.id;
  const {
    provider_id,
    model,
    event_type = 'generation',
    prompt_id,
    custom_instruction,
    selected_text = '',
    context_text = ''
  } = req.body;

  const db = getDb();

  // Resolve Provider & Model
  let targetProviderId = provider_id;
  let targetModel = model;

  if (!targetProviderId || !targetModel) {
    const config = db.prepare('SELECT * FROM llm_configurations WHERE user_id = ?').get(userId);
    if (event_type === 'selection') {
      targetProviderId = targetProviderId || config?.default_selection_provider_id;
      targetModel = targetModel || config?.default_selection_model;
    } else {
      targetProviderId = targetProviderId || config?.default_generation_provider_id;
      targetModel = targetModel || config?.default_generation_model;
    }
  }

  // If still not resolved, check any configured provider
  if (!targetProviderId) {
    const firstProvider = db.prepare('SELECT * FROM llm_providers WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId);
    if (!firstProvider) {
      return res.status(400).json({ error: 'No LLM Provider configured. Please configure an LLM provider in Settings.' });
    }
    targetProviderId = firstProvider.id;
  }

  const provider = db.prepare('SELECT * FROM llm_providers WHERE id = ? AND user_id = ?').get(targetProviderId, userId);
  if (!provider) {
    return res.status(404).json({ error: 'Selected LLM provider not found.' });
  }

  if (!targetModel) {
    targetModel = 'gpt-4o-mini'; // fallback generic model name
  }

  // Resolve System Prompt & User Prompt Template
  let systemPrompt = 'You are a helpful AI knowledge assistant. Answer accurately and format cleanly in Markdown.';
  let promptTemplate = '{{input}}';

  if (prompt_id) {
    const promptDef = db.prepare('SELECT * FROM ai_prompts WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(prompt_id, userId);
    if (promptDef) {
      if (promptDef.system_prompt) systemPrompt = promptDef.system_prompt;
      if (promptDef.user_prompt_template) promptTemplate = promptDef.user_prompt_template;
    }
  }

  // Token interpolation: {{input}}, {{context}}
  const rawInput = custom_instruction || selected_text || '';
  let finalUserContent = promptTemplate
    .replaceAll('{{input}}', rawInput)
    .replaceAll('{{context}}', context_text);

  if (!prompt_id && custom_instruction && selected_text) {
    finalUserContent = `${custom_instruction}\n\nPassage:\n"${selected_text}"`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: finalUserContent }
  ];

  // Setup Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  logAudit(userId, 'ai_stream_request', { providerLabel: provider.label, model: targetModel, event_type });

  await streamChatCompletion({
    baseUrl: provider.base_url,
    apiKey: provider.api_key,
    model: targetModel,
    messages,
    onChunk: (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    },
    onDone: () => {
      res.write('data: [DONE]\n\n');
      res.end();
    },
    onError: (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });
});

export default router;
