const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Remove deprecated options - they're no longer needed in Mongoose 6+
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Please make sure MongoDB is running on your system.');
    console.error('You can start MongoDB with: brew services start mongodb-community (on macOS)');
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;