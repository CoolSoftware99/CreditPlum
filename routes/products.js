const express = require('express');
const { query, validationResult } = require('express-validator');
const Product = require('../models/Product');

const router = express.Router();

/**
 * GET /api/products
 * Query params:
 *   score       - applicant FICO (300–850). Personalizes approval odds & ordering.
 *   category    - secured-card | unsecured-card | credit-builder-loan | personal-loan
 *   maxFee      - only products with annualFee <= maxFee
 *   sort        - 'odds' (default) | 'fee' | 'name'
 *
 * Returns products annotated with an approval estimate for the given score.
 */
router.get(
  '/',
  query('score').optional().isInt({ min: 300, max: 850 }).toInt(),
  query('category')
    .optional()
    .isIn(['secured-card', 'unsecured-card', 'credit-builder-loan', 'personal-loan']),
  query('maxFee').optional().isInt({ min: 0 }).toInt(),
  query('sort').optional().isIn(['odds', 'fee', 'name']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Invalid filter.', details: errors.array() });
    }
    try {
      const filter = { active: true };
      if (req.query.category) filter.category = req.query.category;
      if (req.query.maxFee !== undefined) filter.annualFee = { $lte: req.query.maxFee };

      const products = await Product.find(filter).lean({ virtuals: false });

      const score = req.query.score;
      let annotated = products.map((p) => {
        const doc = Product.hydrate(p);
        const match = score ? doc.matchForScore(score) : null;
        return {
          ...p,
          match: match || { inBand: null, estimatedApprovalOdds: p.approvalLikelihood },
        };
      });

      const sort = req.query.sort || 'odds';
      annotated.sort((a, b) => {
        if (sort === 'fee') return a.annualFee - b.annualFee;
        if (sort === 'name') return a.name.localeCompare(b.name);
        // default: best odds first, then manual weight
        const oddsDiff = b.match.estimatedApprovalOdds - a.match.estimatedApprovalOdds;
        return oddsDiff !== 0 ? oddsDiff : b.sortWeight - a.sortWeight;
      });

      res.json({ count: annotated.length, score: score || null, products: annotated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
