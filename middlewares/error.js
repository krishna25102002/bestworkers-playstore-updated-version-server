const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
  
    // Log to console for dev
    console.error(err.stack);
  
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      const message = `Resource not found with id of ${err.value}`;
      error = new Error(message);
      error.statusCode = 404;
    }
  
    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const message = `Duplicate field value entered for ${field}`;
      error = new Error(message);
      error.statusCode = 400;
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message);
      error = new Error(message);
      error.statusCode = 400;
    }
  
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Server Error',
    });
  };
  
  module.exports = errorHandler;