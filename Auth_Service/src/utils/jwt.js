const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: jwtExpire || '30d' // Default to 30 days if not set
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

module.exports = {
  signToken,
  verifyToken
};