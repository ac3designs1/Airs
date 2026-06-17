const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// GET /api/certifications — all cert EOI applications
// Leadership sees all; officers see their own
router.get('/', authenticateToken, (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  if (isLeader) return res.json(db.prepare('SELECT * FROM cert_applications ORDER BY created_at DESC').all());
  res.json(db.prepare('SELECT * FROM cert_applications WHERE officer_id=? ORDER BY created_at DESC').all(req.user.id));
});

// POST /api/certifications — submit EOI
router.post('/', authenticateToken, (req, res) => {
  const { cert_name, cert_category, why_interested, skills, goals } = req.body;
  if (!cert_name) return res.status(400).json({ error: 'Certification name required' });

  // Check for duplicate pending
  const dup = db.prepare("SELECT id FROM cert_applications WHERE officer_id=? AND cert_name=? AND status='pending'").get(req.user.id, cert_name);
  if (dup) return res.status(409).json({ error: 'You already have a pending application for this certification' });

  const officer = db.prepare('SELECT first_name, last_name, callsign FROM officers WHERE id=?').get(req.user.id);
  const name = officer ? `${officer.first_name} ${officer.last_name}` : req.user.username;
  const id = uuidv4();

  db.prepare(`INSERT INTO cert_applications (id,officer_id,officer_name,callsign,cert_name,cert_category,why_interested,skills,goals) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, name, officer?.callsign ?? null, cert_name, cert_category || '', why_interested || '', skills || '', goals || '');

  res.status(201).json(db.prepare('SELECT * FROM cert_applications WHERE id=?').get(id));
});

// PUT /api/certifications/:id — approve/deny
router.put('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status, review_notes } = req.body;
  if (!['approved', 'denied', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const reviewer = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
  db.prepare(`UPDATE cert_applications SET status=?,reviewed_by=?,review_notes=?,reviewed_at=datetime('now') WHERE id=?`)
    .run(status, reviewer, review_notes || '', req.params.id);

  res.json(db.prepare('SELECT * FROM cert_applications WHERE id=?').get(req.params.id));
});

// DELETE /api/certifications/:id
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM cert_applications WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
