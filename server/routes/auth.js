import express from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { hashPassword, comparePassword, signToken } from '../utils/crypto.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid email and password (min 6 characters) required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = getDb();

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // First user becomes superadmin!
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const role = userCount === 0 ? 'superadmin' : 'user';

    const userId = crypto.randomUUID();
    const password_hash = await hashPassword(password);
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, status, token_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', 1, ?, ?)
    `).run(userId, cleanEmail, password_hash, role, now, now);

    const token = signToken({ userId, role, token_version: 1 });
    logAudit(userId, 'user_registered', { email: cleanEmail, role });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        email: cleanEmail,
        role,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = getDb();

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      logAudit(user.id, 'login_failed', { email: cleanEmail }, 'warn');
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      token_version: user.token_version
    });

    logAudit(user.id, 'user_logged_in', { email: cleanEmail });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Internal login error.' });
  }
});

// Get current user profile
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, role, status, token_version, created_at, updated_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ user });
});

// Logout (instant revocation)
router.post('/logout', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?').run(Date.now(), req.user.id);
  logAudit(req.user.id, 'user_logged_out');
  return res.json({ success: true, message: 'All active sessions invalidated.' });
});

// Change Password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  const newHash = await hashPassword(newPassword);
  db.prepare(`
    UPDATE users 
    SET password_hash = ?, token_version = token_version + 1, updated_at = ? 
    WHERE id = ?
  `).run(newHash, Date.now(), req.user.id);

  logAudit(req.user.id, 'password_changed');
  const newToken = signToken({
    userId: user.id,
    role: user.role,
    token_version: user.token_version + 1
  });

  return res.json({ success: true, message: 'Password changed successfully.', token: newToken });
});

export default router;
