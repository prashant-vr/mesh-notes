import express from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Build folder tree from flat list
const buildFolderTree = (folders, parentId = null) => {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({
      ...f,
      children: buildFolderTree(folders, f.id)
    }));
};

// GET /api/folders (returns hierarchy tree + memo counts)
router.get('/', (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  const folders = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM memos m WHERE m.folder_id = f.id) as memo_count
    FROM folders f
    WHERE f.user_id = ?
    ORDER BY f.name ASC
  `).all(userId);

  const unorganizedCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM memos 
    WHERE user_id = ? AND folder_id IS NULL
  `).get(userId).count;

  const tree = buildFolderTree(folders);

  return res.json({
    folders,
    tree,
    unorganized_count: unorganizedCount
  });
});

// POST /api/folders
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { name, parent_id, color = '#6366f1' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required.' });
  }

  const db = getDb();
  if (parent_id) {
    const parent = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(parent_id, userId);
    if (!parent) {
      return res.status(400).json({ error: 'Parent folder does not exist.' });
    }
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO folders (id, user_id, parent_id, name, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, parent_id || null, name.trim(), color, now);

  return res.status(201).json({
    folder: {
      id,
      user_id: userId,
      parent_id: parent_id || null,
      name: name.trim(),
      color,
      created_at: now,
      memo_count: 0,
      children: []
    }
  });
});

// PATCH /api/folders/:id
router.patch('/:id', (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, parent_id, color } = req.body;

  const db = getDb();
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(id, userId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found.' });
  }

  if (parent_id === id) {
    return res.status(400).json({ error: 'Folder cannot be its own parent.' });
  }

  const updatedName = name !== undefined ? name.trim() : folder.name;
  const updatedParent = parent_id !== undefined ? parent_id : folder.parent_id;
  const updatedColor = color !== undefined ? color : folder.color;

  db.prepare(`
    UPDATE folders
    SET name = ?, parent_id = ?, color = ?
    WHERE id = ? AND user_id = ?
  `).run(updatedName, updatedParent, updatedColor, id, userId);

  return res.json({ success: true, message: 'Folder updated successfully.' });
});

// DELETE /api/folders/:id
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { cascade } = req.query; // cascade delete memos or set to null

  const db = getDb();
  if (cascade !== 'true') {
    // Unassign memos before folder deletion
    db.prepare('UPDATE memos SET folder_id = NULL WHERE folder_id = ? AND user_id = ?').run(id, userId);
  }

  const result = db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(id, userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Folder not found.' });
  }

  return res.json({ success: true, message: 'Folder deleted.' });
});

export default router;
