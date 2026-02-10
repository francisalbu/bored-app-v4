/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the API
 */

function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
