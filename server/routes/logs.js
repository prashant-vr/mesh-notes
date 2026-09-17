import express from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/logs
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;
  const db = getDb();

  // Superadmins can see all system logs, normal users see their own
  let query = 'SELECT * FROM audit_logs';
  const params = [];

  if (req.user.role !== 'superadmin') {
    query += ' WHERE user_id = ? OR user_id IS NULL';
    params.push(userId);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const logs = db.prepare(query).all(...params);
  return res.json({ logs });
});

export default router;
