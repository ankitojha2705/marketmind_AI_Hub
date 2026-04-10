require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_service',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  // Add other environment variables here as needed
};
