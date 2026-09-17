import crypto from 'node:crypto';

let dbInstance = null;

export const setDbForLogger = (db) => {
  dbInstance = db;
};

export const logAudit = (userId, action, details = {}, status = 'success') => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] [${timestamp}] [${action}] user:${userId || 'system'} status:${status}`, details);

  if (dbInstance) {
    try {
      const stmt = dbInstance.prepare(`
        INSERT INTO audit_logs (id, user_id, action, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        crypto.randomUUID(),
        userId || null,
        action,
        typeof details === 'object' ? JSON.stringify(details) : String(details),
        status,
        Date.now()
      );
    } catch (err) {
      console.error('[AUDIT_ERROR] Failed inserting log entry into SQLite:', err.message);
    }
  }
};

export const logInfo = (message, data) => {
  if (data !== undefined) {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, data);
  } else {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`);
  }
};

export const logError = (message, error) => {
  console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error);
};
