const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/schema');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password, first_name, last_name, callsign, department, rank } = req.body;
  if (!username || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const exists = db.prepare('SELECT id FROM officers WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  // auto-generate an internal badge_number from username so the NOT NULL constraint is met
  const auto_badge = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
  db.prepare(`INSERT INTO officers (id,badge_number,username,password,first_name,last_name,rank,department,role,status,callsign) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, auto_badge, username, hash, first_name, last_name, rank || 'Recruit', department || 'Academy', 'recruit', 'off_duty', callsign || null
  );
  res.status(201).json({ message: 'Account created' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const officer = db.prepare('SELECT * FROM officers WHERE username = ?').get(username);
  if (!officer) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, officer.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    {
      id: officer.id,
      username: officer.username,
      role: officer.role,
      callsign: officer.callsign,
      first_name: officer.first_name,
      last_name: officer.last_name,
      department: officer.department,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  db.prepare('UPDATE officers SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(officer.id);
  db.prepare('INSERT INTO activity_log (id, officer_id, action, details) VALUES (?, ?, ?, ?)').run(
    uuidv4(), officer.id, 'LOGIN', `Officer ${officer.callsign || officer.username} logged in`
  );

  const { password: _, badge_number: __, ...safeOfficer } = officer;
  res.json({ token, officer: safeOfficer });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  db.prepare('INSERT INTO activity_log (id, officer_id, action, details) VALUES (?, ?, ?, ?)').run(
    uuidv4(), req.user.id, 'LOGOUT', `Officer ${req.user.callsign || req.user.username} logged out`
  );
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const officer = db.prepare('SELECT * FROM officers WHERE id = ?').get(req.user.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });
  const { password: _, badge_number: __, ...safeOfficer } = officer;
  res.json(safeOfficer);
});

// PUT /api/auth/profile — update own callsign / password
router.put('/profile', authenticateToken, (req, res) => {
  const { callsign, current_password, new_password } = req.body;
  const officer = db.prepare('SELECT * FROM officers WHERE id = ?').get(req.user.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  let hash = officer.password;
  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password required to change password' });
    if (!bcrypt.compareSync(current_password, officer.password)) return res.status(401).json({ error: 'Current password incorrect' });
    hash = bcrypt.hashSync(new_password, 10);
  }

  db.prepare('UPDATE officers SET callsign=?, password=? WHERE id=?').run(callsign ?? officer.callsign, hash, officer.id);
  const updated = db.prepare('SELECT * FROM officers WHERE id = ?').get(officer.id);
  const { password: _, badge_number: __, ...safe } = updated;
  res.json(safe);
});

// PUT /api/auth/status
router.put('/status', authenticateToken, (req, res) => {
  const { status, callsign } = req.body;
  const allowed = ['on_duty', 'off_duty', 'busy', 'on_scene', 'available', 'on_break'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare('UPDATE officers SET status = ?, callsign = ? WHERE id = ?').run(status, callsign || null, req.user.id);
  res.json({ status, callsign });
});

module.exports = router;
