const express = require('express');
const crypto = require('crypto');
const Product = require('../models/Product');
const AffiliateEvent = require('../models/AffiliateEvent');

const router = express.Router();

// Coarse UA family so we don't store full fingerprints.
function uaFamily(ua = '') {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (ua) return 'desktop';
  return 'unknown';
}

// Hash + truncate an IP so we can dedup without storing PII.
function ipFingerprint(req) {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  if (!ip) return '';
  const salt = process.env.JWT_SECRET || 'salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}

/**
 * GET /go/:slug   (mounted at app root, not under /api)
 * Records a click, then 302-redirects to the partner with our clickId appended
 * as the sub-id the network echoes back on conversion.
 */
router.get('/go/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true });
    if (!product) return res.status(404).send('Offer not found.');

    const clickId = crypto.randomBytes(12).toString('hex');
    await AffiliateEvent.create({
      clickId,
      product: product._id,
      user: req.user ? req.user._id : null,
      type: 'click',
      referrer: (req.get('referer') || '').slice(0, 300),
      userAgentFamily: uaFamily(req.get('user-agent')),
      ipFingerprint: ipFingerprint(req),
    });

    // Append our clickId as the network sub-id. Most networks accept `subid`
    // or `aff_sub`; adjust per partner. We keep the partner's own params intact.
    const target = new URL(product.affiliateUrl);
    target.searchParams.set('subid', clickId);
    res.redirect(302, target.toString());
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/affiliate/postback
 * Server-to-server conversion callback from the network.
 * Example: /api/affiliate/postback?subid=<clickId>&payout=45.00&secret=...
 *
 * Protect this with a shared secret in production (AFFILIATE_POSTBACK_SECRET).
 */
router.get('/postback', async (req, res, next) => {
  try {
    const secret = process.env.AFFILIATE_POSTBACK_SECRET;
    if (secret && req.query.secret !== secret) {
      return res.status(403).json({ error: 'Invalid postback secret.' });
    }
    const { subid, payout, currency } = req.query;
    if (!subid) return res.status(400).json({ error: 'Missing subid.' });

    const event = await AffiliateEvent.findOne({ clickId: subid });
    if (!event) return res.status(404).json({ error: 'Unknown click.' });

    event.type = 'conversion';
    event.converted = true;
    event.convertedAt = new Date();
    event.payoutAmount = payout ? Number(payout) : 0;
    if (currency) event.currency = currency;
    await event.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
