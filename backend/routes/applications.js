const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    discord TEXT NOT NULL,
    age INTEGER NOT NULL,
    timezone TEXT NOT NULL,
    experience TEXT,
    why_join TEXT NOT NULL,
    availability TEXT,
    referral TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    review_notes TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// POST /api/applications — public, no auth
router.post('/', (req, res) => {
  const { full_name, discord, age, timezone, experience, why_join, availability, referral } = req.body;
  if (!full_name || !discord || !age || !timezone || !why_join) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  const id = uuidv4();
  db.prepare(`INSERT INTO applications (id,full_name,discord,age,timezone,experience,why_join,availability,referral)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, full_name, discord, age, timezone, experience || '', why_join, availability || '', referral || '');
  res.status(201).json({ message: 'Application submitted', id });
});

// GET /api/applications — leadership only
router.get('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.query;
  let q = 'SELECT * FROM applications';
  const params = [];
  if (status) { q += ' WHERE status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

// PUT /api/applications/:id — approve or deny
router.put('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status, review_notes } = req.body;
  if (!['approved', 'denied', 'pending', 'interview'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const reviewer = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
  db.prepare(`UPDATE applications SET status=?, reviewed_by=?, review_notes=?, reviewed_at=datetime('now') WHERE id=?`)
    .run(status, reviewer, review_notes || '', req.params.id);
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
});

// DELETE /api/applications/:id
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// GET /api/applications/stats
router.get('/stats', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.json({ pending: 0 });
  const row = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'pending'").get();
  res.json({ pending: row.c });
});

module.exports = router;
