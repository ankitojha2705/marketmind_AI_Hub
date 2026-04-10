class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    /** Expected / handled errors (vs programming or system failures) */
    this.isOperational = true;
  }
}

const createError = (statusCode, message) => {
  return new ErrorResponse(message, statusCode);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  const statusCode = error.statusCode || 500;
  const logLine = `${req.method} ${req.originalUrl}`;
  const msgForLog = Array.isArray(error.message)
    ? error.message.join('; ')
    : error.message;

  if (statusCode < 500) {
    console.warn(`[${statusCode}] ${logLine} — ${msgForLog}`);
  } else {
    console.error(`[${statusCode}] ${logLine}`, err.stack || msgForLog);
  }

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = {
  ErrorResponse,
  createError,
  errorHandler,
};
