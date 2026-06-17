require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { initDb } = require('./db/schema');

const app = express();
const server = http.createServer(app);

/* ─────────────────────────────────────────────────────────
   CORS — restrict to configured origin(s)
────────────────────────────────────────────────────────── */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (no Origin header) or configured origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ─────────────────────────────────────────────────────────
   Security headers (Helmet)
────────────────────────────────────────────────────────── */
app.use(helmet({
  crossOriginEmbedderPolicy: false,  // Allow dev tools
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
}));

// Hide stack traces in production
app.set('env', process.env.NODE_ENV || 'production');

/* ─────────────────────────────────────────────────────────
   Body parsing — cap at 512 KB to prevent DoS
────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));

/* ─────────────────────────────────────────────────────────
   Rate limiters
────────────────────────────────────────────────────────── */
// Strict limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 20,                       // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again in 15 minutes' },
  skipSuccessfulRequests: true,  // Only count failures
});

// Standard API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute
  max: 300,                      // 300 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded — slow down' },
});

// Strict limiter for public-facing application form
const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,     // 1 hour
  max: 5,                        // 5 applications per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions — try again later' },
});

// Apply general API limiter to all API routes
app.use('/api/', apiLimiter);

/* ─────────────────────────────────────────────────────────
   Socket.io — restrict to same origins
────────────────────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

/* ─────────────────────────────────────────────────────────
   Routes
────────────────────────────────────────────────────────── */
// Auth — strict rate-limiting on login/register
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/auth'));

// Public application form — heavily rate-limited
app.post('/api/applications', publicFormLimiter);

// All other API routes
app.use('/api/citizens',       require('./routes/citizens'));
app.use('/api/vehicles',       require('./routes/vehicles'));
app.use('/api/warrants',       require('./routes/warrants'));
app.use('/api/bolos',          require('./routes/bolos'));
app.use('/api/incidents',      require('./routes/incidents'));
app.use('/api/dispatch',       require('./routes/dispatch'));
app.use('/api/roster',         require('./routes/roster'));
app.use('/api/applications',   require('./routes/applications'));
app.use('/api/shifts',         require('./routes/shifts'));
app.use('/api/leave',          require('./routes/leave'));
app.use('/api/announcements',  require('./routes/announcements'));
app.use('/api/certifications', require('./routes/certifications'));
app.use('/api/strikes',        require('./routes/strikes'));
app.use('/api/promotions',     require('./routes/promotions'));
app.use('/api/weapons',        require('./routes/weapons'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/fpos',           require('./routes/fpos'));
app.use('/api/terminations',   require('./routes/terminations'));
app.use('/api/transfers',      require('./routes/transfers'));
app.use('/api/recruit-progress', require('./routes/recruit_progress'));
app.use('/api/fto-shifts',     require('./routes/fto_shifts'));
app.use('/api/rewards',        require('./routes/rewards'));
app.use('/api/feedback',       require('./routes/feedback'));
app.use('/api/recruit-stages', require('./routes/recruit_stages'));
app.use('/api/stats',          require('./routes/stats'));

// Health — no sensitive info
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

/* ─────────────────────────────────────────────────────────
   Global error handler — never leak stack traces
────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  // CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  // Don't leak internal details to the client
  res.status(500).json({ error: 'Internal server error' });
});

/* ─────────────────────────────────────────────────────────
   Socket.io
────────────────────────────────────────────────────────── */
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

/* ─────────────────────────────────────────────────────────
   Start
────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3001;
initDb();
server.listen(PORT, () => {
  console.log('\n  NextAirs MDT — Next Gen Internal Reporting System');
  console.log(`  API listening on port ${PORT}`);
  console.log(`  CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}\n`);
  // Never log credentials to console
});
