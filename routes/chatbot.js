const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const Product = require('../models/Product');
const Article = require('../models/Article');

const router = express.Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CHATBOT_MODEL || 'claude-sonnet-5';

// Chat is expensive and abusable — cap it per IP.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are sending messages too quickly. Please wait a moment.' },
});

/**
 * The assistant's operating instructions. This is where CreditPlum's voice and
 * its hard safety lines live. Keep guardrails here, not in client code.
 */
const SYSTEM_PROMPT = `You are Plum, the assistant on CreditPlum, a site that helps people
with poor or fair credit understand their options and rebuild. Your audience is often
stressed and may feel judged elsewhere. Be plain-spoken, warm, and never condescending.

VOICE
- Short sentences. No jargon without a quick plain-English definition.
- Encouraging and non-judgmental. Rebuilding credit is normal and doable.
- Concrete next steps over vague reassurance.

WHAT YOU DO
- Explain how credit scores work, what hurts and helps them, and realistic timelines.
- Help people understand which product CATEGORIES fit their situation (e.g. a secured card
  vs. a credit-builder loan) and why.
- When product context is provided below, you may mention specific products by name, but
  frame approval odds as ESTIMATES, never guarantees.

HARD RULES (do not break these)
- You are not a financial advisor, lawyer, or credit-repair company. Do not give
  individualized investment, tax, or legal advice. For anything requiring personal advice,
  tell the user to consult a licensed professional or a nonprofit credit counselor
  (e.g. an NFCC-affiliated agency).
- Never promise approval, a specific score change, or a specific timeline as a certainty.
- Never suggest anything deceptive or illegal: no advice on hiding information from lenders,
  disputing accurate items as if false, "credit privacy numbers"/CPNs, synthetic identities,
  or gaming a lender. If asked, briefly explain why it's risky and illegal, and offer a
  legitimate alternative.
- Do not ask for or accept full account numbers, SSNs, card numbers, or passwords. If a user
  starts to share them, tell them to stop and that they never need to share those here.
- If a user is in financial crisis (eviction, utility shutoff, debt collectors, considering
  bankruptcy), acknowledge it, keep it practical, and point them to nonprofit credit
  counseling and, where relevant, legal aid.

FORMAT
- Keep answers tight: a direct answer first, then 2–4 concrete steps if useful.
- End with a one-line reminder to verify details, since terms and their own numbers vary.`;

// Pull a little grounding context so answers reflect real CreditPlum inventory/content.
async function buildContext(userScore) {
  const productFilter = { active: true };
  const products = await Product.find(productFilter)
    .select('name issuer category minScore maxScore approvalLikelihood annualFee bestFor slug')
    .limit(12)
    .lean();

  const articles = await Article.find({ published: true })
    .select('title excerpt slug category')
    .limit(8)
    .lean();

  const productLines = products
    .map(
      (p) =>
        `- ${p.name} (${p.issuer}) [${p.category}] targets FICO ${p.minScore}-${p.maxScore}, ` +
        `annual fee $${p.annualFee}. Best for: ${p.bestFor || 'general rebuilding'}. slug:${p.slug}`
    )
    .join('\n');

  const articleLines = articles.map((a) => `- "${a.title}" — ${a.excerpt} (slug:${a.slug})`).join('\n');

  return [
    userScore ? `The visitor says their approximate credit score is ${userScore}.` : '',
    'CURRENT PRODUCTS ON CREDITPLUM:',
    productLines || '(none loaded)',
    '',
    'RECENT EDUCATION ARTICLES:',
    articleLines || '(none loaded)',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * POST /api/chat
 * Body: { messages: [{role:'user'|'assistant', content:string}], score?: number }
 * Returns: { reply: string }
 *
 * The client sends the running conversation each turn (the model is stateless).
 */
router.post(
  '/',
  chatLimiter,
  body('messages').isArray({ min: 1, max: 30 }),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().isLength({ min: 1, max: 4000 }),
  body('score').optional().isInt({ min: 300, max: 850 }).toInt(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Invalid chat payload.', details: errors.array() });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'The assistant is not configured yet. Set ANTHROPIC_API_KEY on the server.',
      });
    }

    try {
      const context = await buildContext(req.body.score);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 700,
        system: `${SYSTEM_PROMPT}\n\n---\nCONTEXT FOR THIS CONVERSATION:\n${context}`,
        messages: req.body.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const reply = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      res.json({ reply: reply || "Sorry, I didn't catch that. Could you rephrase?" });
    } catch (err) {
      // Don't leak provider internals to the client.
      console.error('[chat] provider error:', err.message);
      res.status(502).json({ error: 'The assistant is having trouble right now. Try again shortly.' });
    }
  }
);

module.exports = router;
