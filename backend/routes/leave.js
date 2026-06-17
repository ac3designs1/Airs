const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// GET /api/leave
router.get('/', authenticateToken, (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  if (isLeader) {
    return res.json(db.prepare('SELECT * FROM leave_requests ORDER BY created_at DESC').all());
  }
  res.json(db.prepare('SELECT * FROM leave_requests WHERE officer_id = ? ORDER BY created_at DESC').all(req.user.id));
});

// POST /api/leave
router.post('/', authenticateToken, (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  if (!leave_type || !start_date || !end_date) return res.status(400).json({ error: 'Missing required fields' });

  const officer = db.prepare('SELECT first_name, last_name, callsign, department FROM officers WHERE id = ?').get(req.user.id);
  const id = uuidv4();
  const name = officer ? `${officer.first_name} ${officer.last_name}` : req.user.username;

  db.prepare(`INSERT INTO leave_requests (id,officer_id,officer_name,callsign,department,leave_type,start_date,end_date,reason) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, name, officer?.callsign ?? null, officer?.department ?? null, leave_type, start_date, end_date, reason || '');

  res.status(201).json(db.prepare('SELECT * FROM leave_requests WHERE id=?').get(id));
});

// PUT /api/leave/:id — approve/deny (leadership only)
router.put('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status, review_notes } = req.body;
  if (!['approved', 'denied', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const reviewer = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
  db.prepare(`UPDATE leave_requests SET status=?, reviewed_by=?, review_notes=?, reviewed_at=datetime('now') WHERE id=?`)
    .run(status, reviewer, review_notes || '', req.params.id);

  res.json(db.prepare('SELECT * FROM leave_requests WHERE id=?').get(req.params.id));
});

// DELETE /api/leave/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const req_ = db.prepare('SELECT * FROM leave_requests WHERE id=?').get(req.params.id);
  if (!req_) return res.status(404).json({ error: 'Not found' });
  if (req_.officer_id !== req.user.id && !LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM leave_requests WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
