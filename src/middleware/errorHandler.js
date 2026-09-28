/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Route Not Found middleware
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
};

/**
 * Centralized global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message}`);
    if (err.stack && statusCode === 500) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    status: err.status || 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  AppError,
  notFoundHandler,
  globalErrorHandler,
};
