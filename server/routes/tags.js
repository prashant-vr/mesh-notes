import express from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// List all distinct tags with counts
router.get('/', (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  const tags = db.prepare(`
    SELECT t.id, t.name, 
      (SELECT COUNT(*) FROM memo_tags mt WHERE mt.tag_id = t.id) as count
    FROM tags t
    WHERE t.user_id = ?
    ORDER BY count DESC, t.name ASC
  `).all(userId);

  return res.json({ tags });
});

// Delete a tag
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Tag not found.' });
  }

  return res.json({ success: true, message: 'Tag removed.' });
});

export default router;
