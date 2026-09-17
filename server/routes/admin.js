import express from 'express';
import { getDb } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole(['superadmin']));

// List all users
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, email, role, status, token_version, created_at, updated_at
    FROM users
    ORDER BY created_at ASC
  `).all();

  return res.json({ users });
});

// Update user status (active | suspended)
router.patch('/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or suspended.' });
  }

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own account status.' });
  }

  const db = getDb();
  // Increment token_version on suspension to revoke immediately
  const result = db.prepare(`
    UPDATE users 
    SET status = ?, token_version = token_version + 1, updated_at = ? 
    WHERE id = ?
  `).run(status, Date.now(), id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  logAudit(req.user.id, 'admin_update_user_status', { targetUserId: id, newStatus: status });
  return res.json({ success: true, message: `User status updated to ${status}.` });
});

// Update user role
router.patch('/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role.' });
  }

  const db = getDb();
  const result = db.prepare(`
    UPDATE users 
    SET role = ?, updated_at = ? 
    WHERE id = ?
  `).run(role, Date.now(), id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  logAudit(req.user.id, 'admin_update_user_role', { targetUserId: id, newRole: role });
  return res.json({ success: true, message: `User role changed to ${role}.` });
});

// Delete user account
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own superadmin account.' });
  }

  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  logAudit(req.user.id, 'admin_delete_user', { targetUserId: id });
  return res.json({ success: true, message: 'User deleted successfully.' });
});

export default router;
