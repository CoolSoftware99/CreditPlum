const mongoose = require('mongoose');

/**
 * One row per affiliate interaction.
 *
 * A "click" is created when a visitor is redirected out to a partner via
 * /go/:slug. A "conversion" is recorded later via a server-to-server postback
 * from the affiliate network (see routes/affiliate.js). We store a random
 * clickId that we pass to the network as the sub-id, so the postback can find
 * the matching click.
 *
 * Privacy note: we deliberately do NOT store raw IP addresses. We keep a hashed,
 * truncated fingerprint only for basic fraud/dedup checks.
 */

const affiliateEventSchema = new mongoose.Schema(
  {
    clickId: { type: String, required: true, unique: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Optional: which logged-in user, if any.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, enum: ['click', 'conversion'], default: 'click', index: true },
    converted: { type: Boolean, default: false },
    convertedAt: { type: Date, default: null },
    payoutAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },

    referrer: { type: String, default: '' },
    userAgentFamily: { type: String, default: '' }, // coarse UA, not full string
    ipFingerprint: { type: String, default: '' }, // hashed + truncated, not raw IP
  },
  { timestamps: true }
);

affiliateEventSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('AffiliateEvent', affiliateEventSchema);
