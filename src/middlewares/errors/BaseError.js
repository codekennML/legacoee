class AppError extends Error {
  constructor(message,  statusCode, loggerMessage, reason = null) {
    super(message);
    this.loggerMessage = loggerMessage;
    this.statusCode = statusCode;
    this.reason = reason;
    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
