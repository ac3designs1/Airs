const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// GET /api/shifts — my shifts (or all for leadership)
router.get('/', authenticateToken, (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  if (isLeader) {
    const rows = db.prepare('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 200').all();
    return res.json(rows);
  }
  const rows = db.prepare('SELECT * FROM shifts WHERE officer_id = ? ORDER BY start_time DESC').all(req.user.id);
  res.json(rows);
});

// GET /api/shifts/active — my current active shift
router.get('/active', authenticateToken, (req, res) => {
  const row = db.prepare("SELECT * FROM shifts WHERE officer_id = ? AND status = 'active' LIMIT 1").get(req.user.id);
  res.json(row || null);
});

// POST /api/shifts/start — clock in
router.post('/start', authenticateToken, (req, res) => {
  const existing = db.prepare("SELECT id FROM shifts WHERE officer_id = ? AND status = 'active'").get(req.user.id);
  if (existing) return res.status(400).json({ error: 'Already on an active shift' });

  const officer = db.prepare('SELECT first_name, last_name, callsign, department FROM officers WHERE id = ?').get(req.user.id);
  const id = uuidv4();
  const name = officer ? `${officer.first_name} ${officer.last_name}` : req.user.username;

  db.prepare(`INSERT INTO shifts (id,officer_id,officer_name,callsign,department,start_time,status) VALUES (?,?,?,?,?,datetime('now'),'active')`)
    .run(id, req.user.id, name, officer?.callsign ?? null, officer?.department ?? null);

  db.prepare("UPDATE officers SET status='on_duty' WHERE id=?").run(req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM shifts WHERE id=?').get(id));
});

// POST /api/shifts/end — clock out
router.post('/end', authenticateToken, (req, res) => {
  const shift = db.prepare("SELECT * FROM shifts WHERE officer_id = ? AND status = 'active'").get(req.user.id);
  if (!shift) return res.status(404).json({ error: 'No active shift' });

  const { notes } = req.body;
  const start = new Date(shift.start_time);
  const end = new Date();
  const mins = Math.round((end - start) / 60000);

  db.prepare(`UPDATE shifts SET status='completed', end_time=datetime('now'), duration_mins=?, notes=? WHERE id=?`)
    .run(mins, notes || null, shift.id);
  db.prepare("UPDATE officers SET status='off_duty' WHERE id=?").run(req.user.id);

  res.json(db.prepare('SELECT * FROM shifts WHERE id=?').get(shift.id));
});

// GET /api/shifts/stats — aggregate stats
router.get('/stats', authenticateToken, (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  const base = isLeader ? '' : 'WHERE officer_id = ?';
  const params = isLeader ? [] : [req.user.id];

  const total = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(duration_mins),0) as mins FROM shifts WHERE status='completed' ${isLeader ? '' : 'AND officer_id=?'}`).get(...params);
  const active = db.prepare(`SELECT COUNT(*) as c FROM shifts WHERE status='active' ${isLeader ? '' : 'AND officer_id=?'}`).get(...params);
  const week = db.prepare(`SELECT COALESCE(SUM(duration_mins),0) as mins FROM shifts WHERE status='completed' AND start_time >= datetime('now','-7 days') ${isLeader ? '' : 'AND officer_id=?'}`).get(...params);

  res.json({
    total_shifts: total.c,
    total_mins: total.mins,
    active_shifts: active.c,
    week_mins: week.mins,
  });
});

module.exports = router;
