require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const { initDb } = require('./db/schema');
const { createApp, getAllowedOrigins } = require('./app');

const app = createApp();
const server = http.createServer(app);
const ALLOWED_ORIGINS = getAllowedOrigins();

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
