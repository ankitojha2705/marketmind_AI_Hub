const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { createError } = require('../utils/error');

const router = express.Router();


const passport = require('passport');

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = req.user.getSignedJwtToken();
      
      // Redirect to frontend with token and user data
      res.redirect(
        `http://localhost:5173/auth/callback?token=${token}&user=${encodeURIComponent(
          JSON.stringify({
            id: req.user._id,
            name: req.user.fullname,
            email: req.user.email
          })
        )}`
      );
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('http://localhost:5173');
    }
  }
);

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(400, errors.array()[0].msg));
  }
  next();
};

// Public routes
router.post(
  '/register',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 }),
    body('fullname', 'Please include a name').not().isEmpty()
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  validate,
  login
);

// Protected routes
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

module.exports = router;