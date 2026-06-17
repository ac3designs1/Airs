const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDb } = require('./db/schema');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
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
app.use('/api/stats', require('./routes/stats'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', system: 'NextAirs', version: '2.0.0' }));

// Socket.io
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket] Client disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 3001;

initDb();
server.listen(PORT, () => {
  console.log(`\n  ███╗   ██╗███████╗██╗  ██╗████████╗ █████╗ ██╗██████╗ ███████╗`);
  console.log(`  ████╗  ██║██╔════╝╚██╗██╔╝╚══██╔══╝██╔══██╗██║██╔══██╗██╔════╝`);
  console.log(`  ██╔██╗ ██║█████╗   ╚███╔╝    ██║   ███████║██║██████╔╝███████╗`);
  console.log(`  ██║╚██╗██║██╔══╝   ██╔██╗    ██║   ██╔══██║██║██╔══██╗╚════██║`);
  console.log(`  ██║ ╚████║███████╗██╔╝ ██╗   ██║   ██║  ██║██║██║  ██║███████║`);
  console.log(`  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝`);
  console.log(`\n  NextAirs - Next Gen Internal Reporting System`);
  console.log(`  API running on http://localhost:${PORT}`);
  console.log(`  Default login: admin / admin123\n`);
});
