import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mesh-notes-default-secret-change-in-production';

// Helper to optionally resolve user ID from Bearer token
const tryGetUserId = (req) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      return decoded.id;
    }
  } catch (_) {}
  return null;
};

// 1. Create a share link for a note (Owner only)
router.post('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const { memo_id, share_type = 'public', max_views, password } = req.body;

  if (!memo_id) {
    return res.status(400).json({ error: 'memo_id is required.' });
  }

  if (!['public', 'views_limit', 'password'].includes(share_type)) {
    return res.status(400).json({ error: 'Invalid share_type. Must be public, views_limit, or password.' });
  }

  const db = getDb();
  const memo = db.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ?').get(memo_id, userId);
  if (!memo) {
    return res.status(404).json({ error: 'Memo not found.' });
  }

  let parsedMaxViews = null;
  if (share_type === 'views_limit') {
    parsedMaxViews = Math.max(1, parseInt(max_views, 10) || 1);
  }

  let passwordHash = null;
  if (share_type === 'password') {
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required for password-protected shares.' });
    }
    passwordHash = bcrypt.hashSync(password.trim(), 10);
    if (max_views) {
      parsedMaxViews = Math.max(1, parseInt(max_views, 10) || 1);
    }
  }

  // If public, also mark memo as public
  if (share_type === 'public') {
    db.prepare("UPDATE memos SET visibility = 'public', updated_at = ? WHERE id = ?").run(Date.now(), memo_id);
  }

  const shareToken = crypto.randomBytes(8).toString('hex'); // 16-char clean URL token
  const now = Date.now();

  db.prepare(`
    INSERT INTO memo_shares (id, memo_id, user_id, share_type, password_hash, max_views, view_count, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)
  `).run(shareToken, memo_id, userId, share_type, passwordHash, parsedMaxViews, now);

  logAudit(userId, 'create_share_link', 'success', {
    shareId: shareToken,
    memoId: memo_id,
    shareType: share_type,
    maxViews: parsedMaxViews
  });

  return res.status(201).json({
    share: {
      id: shareToken,
      memo_id,
      share_type,
      max_views: parsedMaxViews,
      view_count: 0,
      is_active: 1,
      created_at: now,
      url: `/s/${shareToken}`
    }
  });
});

// 2. List all share links for a note (Owner only)
router.get('/memo/:memoId', authenticate, (req, res) => {
  const userId = req.user.id;
  const { memoId } = req.params;

  const db = getDb();
  const memo = db.prepare('SELECT id FROM memos WHERE id = ? AND user_id = ?').get(memoId, userId);
  if (!memo) {
    return res.status(404).json({ error: 'Memo not found.' });
  }

  const shares = db.prepare(`
    SELECT id, memo_id, share_type, max_views, view_count, is_active, created_at
    FROM memo_shares
    WHERE memo_id = ? AND user_id = ?
    ORDER BY created_at DESC
  `).all(memoId, userId);

  return res.json({ shares });
});

// 3. Revoke a share link (Owner only)
router.delete('/:id', authenticate, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const db = getDb();
  const share = db.prepare('SELECT * FROM memo_shares WHERE id = ? AND user_id = ?').get(id, userId);
  if (!share) {
    return res.status(404).json({ error: 'Share link not found.' });
  }

  db.prepare('DELETE FROM memo_shares WHERE id = ? AND user_id = ?').run(id, userId);

  // If no remaining active public shares, revert memo visibility to private
  const remainingActive = db.prepare(`
    SELECT COUNT(*) as count FROM memo_shares WHERE memo_id = ? AND is_active = 1
  `).get(share.memo_id).count;

  if (remainingActive === 0) {
    db.prepare("UPDATE memos SET visibility = 'private', updated_at = ? WHERE id = ?").run(Date.now(), share.memo_id);
  }

  logAudit(userId, 'revoke_share_link', 'success', { shareId: id, memoId: share.memo_id });

  return res.json({ success: true, message: 'Share link revoked.' });
});

// 4. View a shared note (Public endpoint for visitors)
router.get('/view/:token', (req, res) => {
  const { token } = req.params;
  const db = getDb();

  const share = db.prepare('SELECT * FROM memo_shares WHERE id = ?').get(token);
  if (!share || !share.is_active || (share.max_views !== null && share.view_count >= share.max_views)) {
    return res.status(410).json({
      error: 'This note is no longer accessible. It may have expired or reached its maximum view limit.',
      expired: true
    });
  }

  const memo = db.prepare(`
    SELECT m.*, u.email as author_email 
    FROM memos m 
    JOIN users u ON m.user_id = u.id 
    WHERE m.id = ?
  `).get(share.memo_id);

  if (!memo) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  // Password-protected share -> return metadata without note content
  if (share.share_type === 'password') {
    return res.json({
      id: share.id,
      is_protected: true,
      share_type: 'password',
      max_views: share.max_views,
      view_count: share.view_count,
      created_at: memo.created_at,
      author: memo.author_email.split('@')[0]
    });
  }

  // Check if caller is note author; don't increment view count if author is viewing
  const callerId = tryGetUserId(req);
  const isOwner = callerId && callerId === share.user_id;

  let currentViews = share.view_count;
  if (!isOwner) {
    // Atomic view increment
    const updateResult = db.prepare(`
      UPDATE memo_shares
      SET view_count = view_count + 1,
          is_active = CASE WHEN max_views IS NOT NULL AND view_count + 1 >= max_views THEN 0 ELSE is_active END
      WHERE id = ? AND is_active = 1 AND (max_views IS NULL OR view_count < max_views)
    `).run(share.id);

    if (updateResult.changes === 0) {
      return res.status(410).json({
        error: 'This note has reached its maximum view limit.',
        expired: true
      });
    }

    currentViews += 1;

    // If max views exhausted, revert memo to private
    if (share.max_views !== null && currentViews >= share.max_views) {
      db.prepare("UPDATE memos SET visibility = 'private', updated_at = ? WHERE id = ?").run(Date.now(), share.memo_id);
      logAudit(share.user_id, 'share_exhausted_private', 'success', {
        shareId: share.id,
        memoId: share.memo_id,
        views: currentViews
      });
    }
  }

  const tags = db.prepare(`
    SELECT t.name FROM memo_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.memo_id = ?
  `).all(memo.id).map(t => t.name);

  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE memo_id = ?').get(memo.id);

  return res.json({
    id: share.id,
    content: memo.content,
    created_at: memo.created_at,
    share_type: share.share_type,
    max_views: share.max_views,
    view_count: currentViews,
    is_exhausted: share.max_views !== null && currentViews >= share.max_views,
    tags,
    bookmark,
    author: memo.author_email.split('@')[0]
  });
});

// 5. Unlock password-protected note (Public endpoint for visitors)
router.post('/view/:token/unlock', (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const db = getDb();
  const share = db.prepare('SELECT * FROM memo_shares WHERE id = ?').get(token);
  if (!share || !share.is_active || (share.max_views !== null && share.view_count >= share.max_views)) {
    return res.status(410).json({
      error: 'This note is no longer accessible. It may have expired or reached its maximum view limit.',
      expired: true
    });
  }

  if (share.share_type !== 'password' || !share.password_hash) {
    return res.status(400).json({ error: 'This share does not require a password.' });
  }

  const matches = bcrypt.compareSync(password, share.password_hash);
  if (!matches) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const memo = db.prepare(`
    SELECT m.*, u.email as author_email 
    FROM memos m 
    JOIN users u ON m.user_id = u.id 
    WHERE m.id = ?
  `).get(share.memo_id);

  if (!memo) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  const callerId = tryGetUserId(req);
  const isOwner = callerId && callerId === share.user_id;

  let currentViews = share.view_count;
  if (!isOwner) {
    const updateResult = db.prepare(`
      UPDATE memo_shares
      SET view_count = view_count + 1,
          is_active = CASE WHEN max_views IS NOT NULL AND view_count + 1 >= max_views THEN 0 ELSE is_active END
      WHERE id = ? AND is_active = 1 AND (max_views IS NULL OR view_count < max_views)
    `).run(share.id);

    if (updateResult.changes === 0) {
      return res.status(410).json({
        error: 'This note has reached its maximum view limit.',
        expired: true
      });
    }

    currentViews += 1;

    if (share.max_views !== null && currentViews >= share.max_views) {
      db.prepare("UPDATE memos SET visibility = 'private', updated_at = ? WHERE id = ?").run(Date.now(), share.memo_id);
    }
  }

  const tags = db.prepare(`
    SELECT t.name FROM memo_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.memo_id = ?
  `).all(memo.id).map(t => t.name);

  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE memo_id = ?').get(memo.id);

  return res.json({
    id: share.id,
    content: memo.content,
    created_at: memo.created_at,
    share_type: share.share_type,
    max_views: share.max_views,
    view_count: currentViews,
    is_exhausted: share.max_views !== null && currentViews >= share.max_views,
    tags,
    bookmark,
    author: memo.author_email.split('@')[0]
  });
});

export default router;
