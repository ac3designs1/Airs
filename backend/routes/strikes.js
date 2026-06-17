const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// GET /api/strikes — leadership sees all; officers see their own
router.get('/', authenticateToken, (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  if (isLeader) return res.json(db.prepare('SELECT * FROM strikes ORDER BY created_at DESC').all());
  res.json(db.prepare('SELECT * FROM strikes WHERE officer_id=? ORDER BY created_at DESC').all(req.user.id));
});

// POST /api/strikes — issue a strike
router.post('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { officer_id, reason, severity } = req.body;
  if (!officer_id || !reason) return res.status(400).json({ error: 'officer_id and reason required' });

  const officer = db.prepare('SELECT first_name, last_name, callsign, department FROM officers WHERE id=?').get(officer_id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });

  const issuer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const issuerName = issuer ? `${issuer.first_name} ${issuer.last_name}` : req.user.username;
  const id = uuidv4();

  db.prepare(`INSERT INTO strikes (id,officer_id,officer_name,callsign,department,issued_by_id,issued_by_name,reason,severity) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, officer_id, `${officer.first_name} ${officer.last_name}`, officer.callsign, officer.department, req.user.id, issuerName, reason, severity || 'minor');

  res.status(201).json(db.prepare('SELECT * FROM strikes WHERE id=?').get(id));
});

// PUT /api/strikes/:id — update status (appeal/dismiss)
router.put('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status, appeal_notes } = req.body;
  if (!['active', 'appealed', 'dismissed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE strikes SET status=?, appeal_notes=? WHERE id=?').run(status, appeal_notes || null, req.params.id);
  res.json(db.prepare('SELECT * FROM strikes WHERE id=?').get(req.params.id));
});

// DELETE /api/strikes/:id
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM strikes WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
