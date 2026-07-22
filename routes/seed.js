const express = require('express');
const Product = require('../models/Product');
const Article = require('../models/Article');
const User = require('../models/User');

const router = express.Router();

/**
 * One-time seed endpoint.
 * Visit /api/seed?secret=YOUR_SECRET to load sample products and articles.
 * - Requires the SEED_SECRET env var to match the ?secret= you pass.
 * - By default it will NOT overwrite data if products already exist.
 * - Add &force=1 to wipe and reload (use with care).
 */

const products = [
  {
    slug: 'plum-secured-starter',
    name: 'Starter Secured Card',
    issuer: 'Sample Bank',
    category: 'secured-card',
    minScore: 300,
    maxScore: 619,
    approvalLikelihood: 88,
    annualFee: 0,
    regularApr: '27.99% variable',
    depositRequired: 200,
    reportsToBureaus: ['Equifax', 'Experian', 'TransUnion'],
    highlights: [
      'No annual fee',
      'Refundable deposit sets your limit',
      'Reports to all three bureaus every month',
    ],
    watchOuts: ['You need the deposit up front', 'High APR if you carry a balance'],
    bestFor: 'A first card when your score is low or you have no credit history.',
    affiliateUrl: 'https://example.com/offers/starter-secured?ref=creditplum',
    affiliateNetwork: 'sample',
    sortWeight: 10,
  },
  {
    slug: 'plum-builder-loan',
    name: 'Credit Builder Loan',
    issuer: 'Sample Credit Union',
    category: 'credit-builder-loan',
    minScore: 300,
    maxScore: 640,
    approvalLikelihood: 82,
    annualFee: 0,
    regularApr: '12.00% APR',
    highlights: [
      'No hard pull to apply',
      'Payments build savings and history at the same time',
      'You get the money at the end of the term',
    ],
    watchOuts: ['You pay a little in interest', 'Missing payments can hurt your score'],
    bestFor: 'Building a positive payment record without needing a card.',
    affiliateUrl: 'https://example.com/offers/builder-loan?ref=creditplum',
    affiliateNetwork: 'sample',
    sortWeight: 8,
  },
  {
    slug: 'plum-second-chance-card',
    name: 'Second Chance Unsecured Card',
    issuer: 'Sample Bank',
    category: 'unsecured-card',
    minScore: 560,
    maxScore: 669,
    approvalLikelihood: 60,
    annualFee: 39,
    regularApr: '32.99% variable',
    highlights: ['No deposit required', 'Pre-qualify with no score impact'],
    watchOuts: ['Annual fee', 'Low starting limit', 'Very high APR'],
    bestFor: 'Fair credit when you can not tie up cash in a deposit.',
    affiliateUrl: 'https://example.com/offers/second-chance?ref=creditplum',
    affiliateNetwork: 'sample',
    sortWeight: 5,
  },
  {
    slug: 'plum-rebuild-personal-loan',
    name: 'Rebuild Personal Loan',
    issuer: 'Sample Lending',
    category: 'personal-loan',
    minScore: 580,
    maxScore: 699,
    approvalLikelihood: 55,
    annualFee: 0,
    regularApr: '18.00% – 35.99% APR',
    highlights: ['Check your rate with a soft pull', 'Fixed monthly payment'],
    watchOuts: ['Origination fee may apply', 'Only borrow what you can repay'],
    bestFor: 'Consolidating higher-rate debt once your score reaches fair.',
    affiliateUrl: 'https://example.com/offers/rebuild-loan?ref=creditplum',
    affiliateNetwork: 'sample',
    sortWeight: 3,
  },
];

const articles = [
  {
    slug: 'how-credit-scores-work',
    title: 'How Credit Scores Actually Work',
    category: 'basics',
    excerpt:
      'A plain-English breakdown of what goes into your score, why it moves, and which parts you can control.',
    readingMinutes: 5,
    metaTitle: 'How Credit Scores Work — A Simple Guide | CreditPlum',
    metaDescription:
      'Understand what a credit score is, the five things that shape it, and which ones you can change fastest.',
    published: true,
    body: `A credit score is just a number that guesses how likely you are to pay a loan back on time. Most lenders look at a FICO score, which runs from 300 to 850. Higher is better.

Five things shape that number:

1. **Payment history (about 35%).** Do you pay on time? This is the biggest piece. One late payment can sting, and it can sit on your report for years.
2. **Amounts owed (about 30%).** This is mostly your "utilization" — how much of your available credit you are using. Using a small slice of your limit looks better than maxing it out.
3. **Length of history (about 15%).** Older accounts help. That is why closing your oldest card can backfire.
4. **New credit (about 10%).** Applying for a lot of new accounts at once can ding you a little.
5. **Credit mix (about 10%).** Having a couple of different types, like a card and a loan, helps a bit.

The good news: the two biggest pieces — paying on time and keeping balances low — are the ones you have the most control over. Fix those and the rest tends to follow.

Terms and numbers change, so check your own reports at the official free source before making decisions.`,
  },
  {
    slug: 'steps-to-rebuild-credit',
    title: 'Steps to Rebuild Credit From a Low Score',
    category: 'rebuilding',
    excerpt: 'A calm, step-by-step plan to move your score up, even if you are starting near the bottom.',
    readingMinutes: 6,
    metaTitle: 'How to Rebuild Credit: A Step-by-Step Plan | CreditPlum',
    metaDescription:
      'Rebuilding credit is normal and doable. Here is a clear plan to raise a low score without gimmicks.',
    published: true,
    body: `A low score is a starting point, not a verdict. Here is a plan that works for most people.

**1. See where you stand.** Pull your credit reports from the official free source. Look for errors — wrong balances, accounts that are not yours, or a debt listed twice.

**2. Get everything current.** Late and unpaid accounts hold you back the most. Bring what you can current, oldest missed payments first, and set up autopay so it does not happen again.

**3. Add one positive account.** If you have thin or damaged credit, a secured card or a credit-builder loan gives you a fresh line of on-time payments to report each month.

**4. Keep balances low.** Try to use less than 30% of any card's limit, and less is better. Paying before the statement closes lowers the balance that gets reported.

**5. Be patient and consistent.** Scores move on a lag. Six months of steady, on-time payments usually shows up. A year makes a real difference.

Avoid "quick fix" services that promise to erase accurate information or sell you a new identity number. Those are scams and some are illegal. Steady, boring habits are what actually move the number.`,
  },
  {
    slug: 'secured-vs-builder-loan',
    title: 'Secured Card or Credit-Builder Loan: Which First?',
    category: 'guides',
    excerpt: 'Two beginner-friendly ways to build credit, and how to pick the one that fits your cash and habits.',
    readingMinutes: 4,
    metaTitle: 'Secured Card vs Credit-Builder Loan | CreditPlum',
    metaDescription:
      'Compare secured cards and credit-builder loans in plain language and choose the right first step.',
    published: true,
    body: `Both build a record of on-time payments. They just work differently.

**Secured card.** You put down a deposit, and that becomes your credit limit. You use the card for small purchases and pay it off. It reports like a normal card. Good if you want the flexibility of a card and can spare a deposit.

**Credit-builder loan.** The lender sets aside a small "loan" you cannot touch yet. You make fixed monthly payments, and at the end you get the money. It builds savings and history at once. Good if you would rather not have a card in your wallet, or you want to build a small cushion.

**How to choose:**
- Have $200 to set aside and want everyday flexibility? Lean secured card.
- Want to force yourself to save while you build? Lean builder loan.
- Not sure? Many people start with a no-annual-fee secured card because it is simple.

Whichever you pick, the magic is the same: pay on time, every time. That is what the score is watching.`,
  },
];

router.get('/', async (req, res, next) => {
  try {
    const expected = process.env.SEED_SECRET;
    if (!expected) {
      return res.status(500).json({ error: 'SEED_SECRET is not set on the server.' });
    }
    if (req.query.secret !== expected) {
      return res.status(403).json({ error: 'Forbidden: bad or missing secret.' });
    }

    const existing = await Product.countDocuments();
    const force = req.query.force === '1';

    if (existing > 0 && !force) {
      return res.json({
        ok: true,
        message: `Database already has ${existing} products. Add &force=1 to wipe and reload.`,
        productsInserted: 0,
        articlesInserted: 0,
      });
    }

    if (force) {
      await Product.deleteMany({});
      await Article.deleteMany({});
    }

    await Product.insertMany(products);
    await Article.insertMany(articles);

    const adminEmail = process.env.ADMIN_EMAIL;
    let adminNote = 'No ADMIN_EMAIL set.';
    if (adminEmail) {
      const promoted = await User.findOneAndUpdate(
        { email: adminEmail.toLowerCase() },
        { role: 'admin' },
        { new: true }
      );
      adminNote = promoted
        ? `Promoted ${adminEmail} to admin.`
        : `No user ${adminEmail} yet — register that email, then re-run seed.`;
    }

    res.json({
      ok: true,
      message: 'Seed complete.',
      productsInserted: products.length,
      articlesInserted: articles.length,
      admin: adminNote,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
