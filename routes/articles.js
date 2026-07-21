const express = require('express');
const Article = require('../models/Article');

const router = express.Router();

// GET /api/articles?category=basics
router.get('/', async (req, res, next) => {
  try {
    const filter = { published: true };
    if (req.query.category) filter.category = req.query.category;
    const articles = await Article.find(filter)
      .select('slug title excerpt category tags readingMinutes publishedAt')
      .sort({ publishedAt: -1 })
      .lean();
    res.json({ count: articles.length, articles });
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, published: true }).lean();
    if (!article) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
