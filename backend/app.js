require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sanitizeMiddleware } = require('./middleware/sanitize');

function getAllowedOrigins() {
  return (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createNoopIo() {
  return { emit() {} };
}

function createApp(options = {}) {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'same-origin' },
  }));

  // Trust Railway/Vercel/Render reverse proxy — required for express-rate-limit
  // to correctly read the real client IP from X-Forwarded-For
  app.set('trust proxy', 1);

  app.set('env', process.env.NODE_ENV || 'production');
  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ extended: false, limit: '512kb' }));

  // Strip HTML/script tags from all incoming string body fields (prevents stored XSS)
  app.use(sanitizeMiddleware());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts — try again in 15 minutes' },
    skipSuccessfulRequests: true,
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded — slow down' },
  });

  const publicFormLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions — try again later' },
  });

  app.use('/api/', apiLimiter);
  app.set('io', options.io || createNoopIo());

  // Discord OAuth must be registered BEFORE the main auth router
  // so Express doesn't swallow /api/auth/discord/* into the auth router first
  app.use('/api/auth/discord', require('./routes/discord_auth'));
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth', require('./routes/auth'));

  app.post('/api/applications', publicFormLimiter);

  app.use('/api/citizens', require('./routes/citizens'));
  app.use('/api/vehicles', require('./routes/vehicles'));
  app.use('/api/warrants', require('./routes/warrants'));
  app.use('/api/bolos', require('./routes/bolos'));
  app.use('/api/incidents', require('./routes/incidents'));
  app.use('/api/dispatch', require('./routes/dispatch'));
  app.use('/api/roster', require('./routes/roster'));
  app.use('/api/applications', require('./routes/applications'));
  app.use('/api/shifts', require('./routes/shifts'));
  app.use('/api/leave', require('./routes/leave'));
  app.use('/api/announcements', require('./routes/announcements'));
  app.use('/api/certifications', require('./routes/certifications'));
  app.use('/api/strikes', require('./routes/strikes'));
  app.use('/api/promotions', require('./routes/promotions'));
  app.use('/api/weapons', require('./routes/weapons'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/fpos', require('./routes/fpos'));
  app.use('/api/terminations', require('./routes/terminations'));
  app.use('/api/transfers', require('./routes/transfers'));
  app.use('/api/recruit-progress', require('./routes/recruit_progress'));
  app.use('/api/fto-shifts', require('./routes/fto_shifts'));
  app.use('/api/rewards', require('./routes/rewards'));
  app.use('/api/feedback', require('./routes/feedback'));
  app.use('/api/recruit-stages', require('./routes/recruit_stages'));
  app.use('/api/onboarding', require('./routes/onboarding'));
  app.use('/api/stats', require('./routes/stats'));

  // Public health check — deliberately minimal to avoid information leakage
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((err, req, res, _next) => {
    console.error('[Error]', err.message);
    if (err.message?.startsWith('CORS:')) {
      return res.status(403).json({ error: 'CORS policy violation' });
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp, getAllowedOrigins };