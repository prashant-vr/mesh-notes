import { verifyToken } from '../utils/crypto.js';
import { getDb } from '../db/index.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, status, token_version FROM users WHERE id = ?').get(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account has been suspended.' });
    }

    if (payload.token_version !== user.token_version) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error verifying user session:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

export const requireRole = (allowedRoles = ['admin', 'superadmin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
    }
    next();
  };
};
