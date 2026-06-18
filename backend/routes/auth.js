require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/schema');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/* ── Input helpers ───────────────────────────────────────── */
const MAX = { username: 32, password: 128, name: 64, callsign: 20 };

function sanitiseStr(val, max) {
  if (typeof val !== 'string') return null;
  return val.trim().slice(0, max);
}

function validatePassword(pw) {
  if (!pw || pw.length < 8)  return 'Password must be at least 8 characters';
  if (pw.length > 128)       return 'Password is too long';
  return null;
}

/* ── POST /api/auth/register ────────────────────────────── */
router.post('/register', (req, res) => {
  const username   = sanitiseStr(req.body.username, MAX.username);
  const password   = sanitiseStr(req.body.password, MAX.password);
  const first_name = sanitiseStr(req.body.first_name, MAX.name);
  const last_name  = sanitiseStr(req.body.last_name, MAX.name);
  const callsign   = sanitiseStr(req.body.callsign, MAX.callsign);
  const department = sanitiseStr(req.body.department, 32) || 'Academy';
  const rank       = sanitiseStr(req.body.rank, 64) || 'Recruit';

  if (!username || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // Username: alphanumeric + underscore only
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–32 alphanumeric characters or underscores' });
  }

  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const exists = db.prepare('SELECT id FROM officers WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 12);  // 12 rounds for stronger hashing
  const id = uuidv4();
  const auto_badge = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);

  // New registers are always 'recruit' — role is set by admin later
  db.prepare(`INSERT INTO officers (id,badge_number,username,password,first_name,last_name,rank,department,role,status,callsign)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, auto_badge, username, hash, first_name, last_name, rank, department, 'recruit', 'off_duty', callsign || null
  );
  res.status(201).json({ message: 'Account created. Your role will be set by an administrator.' });
});

/* ── POST /api/auth/login ───────────────────────────────── */
router.post('/login', (req, res) => {
  const username = sanitiseStr(req.body.username, MAX.username);
  const password = sanitiseStr(req.body.password, MAX.password);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const officer = db.prepare('SELECT * FROM officers WHERE username = ?').get(username);

  // Use constant-time comparison even for "not found" to prevent timing attacks
  if (!officer) {
    bcrypt.compareSync('dummy', '$2a$12$invalid.hash.padding.to.prevent.timing.attack.xxx');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Block terminated or suspended officers
  if (officer.role === 'terminated' || officer.status === 'terminated') {
    return res.status(403).json({ error: 'Account suspended — contact an administrator' });
  }

  const valid = bcrypt.compareSync(password, officer.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    {
      id:          officer.id,
      username:    officer.username,
      role:        officer.role,
      callsign:    officer.callsign,
      first_name:  officer.first_name,
      last_name:   officer.last_name,
      department:  officer.department,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  db.prepare('UPDATE officers SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(officer.id);
  db.prepare('INSERT INTO activity_log (id, officer_id, action, details) VALUES (?, ?, ?, ?)').run(
    uuidv4(), officer.id, 'LOGIN', `Officer ${officer.callsign || officer.username} logged in`
  );

  // Strip sensitive fields before returning
  const { password: _pw, badge_number: _bn, ...safeOfficer } = officer;
  res.json({ token, officer: safeOfficer });
});

/* ── POST /api/auth/logout ──────────────────────────────── */
router.post('/logout', authenticateToken, (req, res) => {
  db.prepare('INSERT INTO activity_log (id, officer_id, action, details) VALUES (?, ?, ?, ?)').run(
    uuidv4(), req.user.id, 'LOGOUT', `Officer ${req.user.callsign || req.user.username} logged out`
  );
  res.json({ message: 'Logged out' });
});

/* ── GET /api/auth/me ───────────────────────────────────── */
router.get('/me', authenticateToken, (req, res) => {
  const officer = db.prepare('SELECT * FROM officers WHERE id = ?').get(req.user.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });
  if (officer.role === 'terminated' || officer.status === 'terminated') {
    return res.status(403).json({ error: 'Account suspended' });
  }
  const { password: _pw, badge_number: _bn, ...safe } = officer;
  try { safe.special_roles = JSON.parse(safe.special_roles || '[]'); } catch { safe.special_roles = []; }
  res.json(safe);
});

/* ── PUT /api/auth/profile ──────────────────────────────── */
router.put('/profile', authenticateToken, (req, res) => {
  const callsign     = sanitiseStr(req.body.callsign,     MAX.callsign);
  const in_city_name = sanitiseStr(req.body.in_city_name, 80);
  const cur_pw       = sanitiseStr(req.body.current_password, MAX.password);
  const new_pw       = sanitiseStr(req.body.new_password,     MAX.password);

  const officer = db.prepare('SELECT * FROM officers WHERE id = ?').get(req.user.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  let hash = officer.password;
  if (new_pw) {
    if (!cur_pw) return res.status(400).json({ error: 'Current password required' });
    if (!bcrypt.compareSync(cur_pw, officer.password)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    const pwErr = validatePassword(new_pw);
    if (pwErr) return res.status(400).json({ error: pwErr });
    hash = bcrypt.hashSync(new_pw, 12);
  }

  db.prepare('UPDATE officers SET callsign=?, in_city_name=?, password=? WHERE id=?').run(
    callsign     !== undefined ? callsign     : officer.callsign,
    in_city_name !== undefined ? in_city_name : officer.in_city_name,
    hash,
    officer.id
  );
  const updated = db.prepare('SELECT * FROM officers WHERE id = ?').get(officer.id);
  const { password: _pw, badge_number: _bn, ...safe } = updated;
  res.json(safe);
});

/* ── PUT /api/auth/status ───────────────────────────────── */
router.put('/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const allowed = ['on_duty', 'off_duty', 'busy'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE officers SET status = ? WHERE id = ?').run(status, req.user.id);
  res.json({ status });
});

module.exports = router;
