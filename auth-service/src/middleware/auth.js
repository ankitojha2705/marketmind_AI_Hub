const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { createError } = require('../utils/error');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return next(createError(401, 'Not authorized to access this route'));
    }

    // Verify token
    const decoded = await verifyToken(token);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return next(createError(401, 'Not authorized to access this route'));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError(403, `User role ${req.user.role} is not authorized to access this route`)
      );
    }
    next();
  };
};