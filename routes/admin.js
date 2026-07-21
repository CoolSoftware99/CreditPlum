const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Article = require('../models/Article');
const AffiliateEvent = require('../models/AffiliateEvent');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Everything below requires an admin token.
router.use(requireAdmin);

// --- Products ---

// GET /api/admin/products  (includes inactive)
router.get('/products', async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ updatedAt: -1 }).lean();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products
router.post(
  '/products',
  body('slug').isString().trim().notEmpty(),
  body('name').isString().trim().notEmpty(),
  body('issuer').isString().trim().notEmpty(),
  body('category').isIn(['secured-card', 'unsecured-card', 'credit-builder-loan', 'personal-loan']),
  body('affiliateUrl').isURL(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Invalid product.', details: errors.array() });
    try {
      const product = await Product.create(req.body);
      res.status(201).json({ product });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'That slug already exists.' });
      next(err);
    }
  }
);

// PATCH /api/admin/products/:id  (e.g. swap an affiliate link, toggle active)
router.patch('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id  (soft delete: mark inactive)
router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ ok: true, product });
  } catch (err) {
    next(err);
  }
});

// --- Articles (create/update) ---

router.post('/articles', async (req, res, next) => {
  try {
    const article = await Article.create(req.body);
    res.status(201).json({ article });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'That slug already exists.' });
    next(err);
  }
});

router.patch('/articles/:id', async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!article) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

// --- Affiliate analytics ---

// GET /api/admin/analytics  -> clicks, conversions, revenue per product
router.get('/analytics', async (_req, res, next) => {
  try {
    const rows = await AffiliateEvent.aggregate([
      {
        $group: {
          _id: '$product',
          clicks: { $sum: 1 },
          conversions: { $sum: { $cond: ['$converted', 1, 0] } },
          revenue: { $sum: '$payoutAmount' },
        },
      },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: '$product.name',
          slug: '$product.slug',
          clicks: 1,
          conversions: 1,
          revenue: 1,
          conversionRate: {
            $cond: [{ $gt: ['$clicks', 0] }, { $divide: ['$conversions', '$clicks'] }, 0],
          },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    res.json({ analytics: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
