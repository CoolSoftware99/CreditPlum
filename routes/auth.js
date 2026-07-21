const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Please check the form.', details: errors.array() });
    return false;
  }
  return true;
}

// POST /api/auth/register
router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Use at least 8 characters.'),
  body('displayName').optional().trim().isLength({ max: 80 }),
  async (req, res, next) => {
    if (!handleValidation(req, res)) return;
    try {
      const existing = await User.findOne({ email: req.body.email });
      if (existing) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
      const user = new User({
        email: req.body.email,
        displayName: req.body.displayName || '',
        creditBand: req.body.creditBand || 'unknown',
      });
      user.password = req.body.password; // hashed by pre-save hook
      await user.save();
      const token = signToken(user);
      res.status(201).json({ token, user: user.toJSON() });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    if (!handleValidation(req, res)) return;
    try {
      // Need the hash for this query, so re-select it.
      const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
      const ok = user && (await user.verifyPassword(req.body.password));
      if (!ok) {
        // Same message for "no user" and "wrong password" to avoid enumeration.
        return res.status(401).json({ error: 'Email or password is incorrect.' });
      }
      const token = signToken(user);
      res.json({ token, user: user.toJSON() });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// PATCH /api/auth/me  (update band or display name)
router.patch(
  '/me',
  requireAuth,
  body('displayName').optional().trim().isLength({ max: 80 }),
  body('creditBand').optional().isIn(['poor', 'fair', 'good', 'excellent', 'unknown']),
  async (req, res, next) => {
    if (!handleValidation(req, res)) return;
    try {
      if (req.body.displayName !== undefined) req.user.displayName = req.body.displayName;
      if (req.body.creditBand !== undefined) req.user.creditBand = req.body.creditBand;
      await req.user.save();
      res.json({ user: req.user.toJSON() });
    } catch (err) {
      next(err);
    }
  }
);

// --- Favorites ---

// GET /api/auth/favorites
router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    await req.user.populate('favorites');
    res.json({ favorites: req.user.favorites });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/favorites/:productId
router.post('/favorites/:productId', requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (!req.user.favorites.some((id) => id.equals(product._id))) {
      req.user.favorites.push(product._id);
      await req.user.save();
    }
    res.json({ favorites: req.user.favorites });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/favorites/:productId
router.delete('/favorites/:productId', requireAuth, async (req, res, next) => {
  try {
    req.user.favorites = req.user.favorites.filter((id) => !id.equals(req.params.productId));
    await req.user.save();
    res.json({ favorites: req.user.favorites });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
