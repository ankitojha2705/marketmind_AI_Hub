require('dotenv').config();
const path = require('path');
const passport = require('passport');
require('./config/passport');
const express = require('express');
const connectDB = require('./config/db');



const app = express();
const PORT = process.env.PORT || 5000;

const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Connect to Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
// Public brand logos (same origin as API; path stored in brand.logo_url for S3 migration later)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Passport middleware

app.use(passport.initialize());

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/brands', require('./routes/brands'));

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Auth Service API is running...');
});

// Error handler middleware (must be after routes)
const { errorHandler } = require('./utils/error');
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});