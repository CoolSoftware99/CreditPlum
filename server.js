require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/db');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const articleRoutes = require('./routes/articles');
const affiliateRoutes = require('./routes/affiliate');
const chatbotRoutes = require('./routes/chatbot');
const adminRoutes = require('./routes/admin');

const app = express();

// Behind a proxy/load balancer in production (needed for correct client IPs + rate limiting).
app.set('trust proxy', 1);

// --- Security headers ---
// The chatbot widget and API calls are same-origin; allow inline styles from our CSS file.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : true }));
app.use(express.json({ limit: '100kb' }));

// Global, gentle rate limit on the API surface.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Attach req.user when a valid token is present (non-blocking).
app.use(attachUser);

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seed', require('./routes/seed'));

// The chatbot widget and API calls are same-origin; allow inline styles from our CSS file.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : true }));
app.use(express.json({ limit: '100kb' }));


// Outbound affiliate redirect lives at the root (/go/:slug).
app.use('/', affiliateRoutes);

// Health check.
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Static frontend ---
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// SPA-ish fallback for the landing page (keep API 404s as JSON above).
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Error handler (last) ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] CreditPlum running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  });

module.exports = app;
