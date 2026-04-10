const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { createError } = require('../utils/error');
const {
  listMyBrands,
  createBrand,
  getBrand,
  updateBrand,
  addMemberByEmail,
  removeMember,
} = require('../controllers/brandController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(400, errors.array()[0].msg));
  }
  next();
};

router.use(protect);

router.get('/', listMyBrands);

router.post(
  '/',
  [
    body('name', 'Brand name is required').trim().notEmpty(),
    body('city', 'City is required').trim().notEmpty(),
    body('country', 'Country is required').trim().notEmpty(),
    body('description').optional().isString(),
  ],
  validate,
  createBrand
);

router.get('/:brandId', getBrand);

router.patch(
  '/:brandId',
  [
    body('name').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('country').optional().trim().notEmpty(),
    body('description').optional().isString(),
  ],
  validate,
  updateBrand
);

router.post(
  '/:brandId/members',
  [body('email', 'Valid email is required').isEmail()],
  validate,
  addMemberByEmail
);

router.delete('/:brandId/members/:userId', removeMember);

module.exports = router;
