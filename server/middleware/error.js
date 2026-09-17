import { logError } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logError(`Unhandled request error on [${req.method} ${req.url}]:`, err.stack || err.message);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: err.message || 'Internal Server Error'
  });
};
