const mongoose = require('mongoose');

/**
 * A single financial product: a credit card, a personal loan, or a
 * credit-building product (secured card, credit-builder loan, etc.).
 *
 * `minScore`/`maxScore` describe the FICO band the product realistically serves.
 * `approvalLikelihood` is our editorial 0–100 estimate of approval odds for a
 * typical applicant in the product's target band — it is guidance, not a promise,
 * and the UI must always label it as an estimate.
 */

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },

    category: {
      type: String,
      required: true,
      enum: ['secured-card', 'unsecured-card', 'credit-builder-loan', 'personal-loan'],
      index: true,
    },

    // FICO band this product is designed for.
    minScore: { type: Number, default: 300, min: 300, max: 850 },
    maxScore: { type: Number, default: 850, min: 300, max: 850 },

    // 0–100 editorial estimate of approval odds within the target band.
    approvalLikelihood: { type: Number, default: 50, min: 0, max: 100 },

    // Money terms. Keep rates as strings where "varies"/"none" is common.
    annualFee: { type: Number, default: 0 },
    regularApr: { type: String, default: 'Varies' },
    depositRequired: { type: Number, default: null }, // secured cards
    reportsToBureaus: { type: [String], default: ['Equifax', 'Experian', 'TransUnion'] },

    highlights: { type: [String], default: [] },
    watchOuts: { type: [String], default: [] },
    bestFor: { type: String, trim: true },

    // Affiliate link is stored on the product; clicks are logged separately.
    affiliateUrl: { type: String, required: true },
    affiliateNetwork: { type: String, default: '' },

    active: { type: Boolean, default: true, index: true },
    sortWeight: { type: Number, default: 0 }, // manual ordering nudge
  },
  { timestamps: true }
);

// Fast filtering for "products this score can realistically get".
productSchema.index({ minScore: 1, maxScore: 1, active: 1 });

/**
 * Score a product against an applicant's FICO. Returns a match object rather than
 * mutating the doc, so the same product can be scored for many users.
 */
productSchema.methods.matchForScore = function matchForScore(score) {
  const inBand = score >= this.minScore && score <= this.maxScore;
  // Soften likelihood the further a score sits below the product's floor.
  let odds = this.approvalLikelihood;
  if (score < this.minScore) {
    const gap = this.minScore - score;
    odds = Math.max(5, this.approvalLikelihood - Math.round(gap / 4));
  }
  return { inBand, estimatedApprovalOdds: odds };
};

module.exports = mongoose.model('Product', productSchema);
