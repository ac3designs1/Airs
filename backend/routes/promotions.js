const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// GET /api/promotions
router.get('/', authenticateToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all());
});

// POST /api/promotions — issue a promotion and update officer rank
router.post('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { officer_id, to_rank, reason } = req.body;
  if (!officer_id || !to_rank) return res.status(400).json({ error: 'officer_id and to_rank required' });

  const officer = db.prepare('SELECT first_name, last_name, callsign, department, rank FROM officers WHERE id=?').get(officer_id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });

  const issuer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const issuerName = issuer ? `${issuer.first_name} ${issuer.last_name}` : req.user.username;
  const id = uuidv4();

  db.prepare(`INSERT INTO promotions (id,officer_id,officer_name,callsign,department,from_rank,to_rank,promoted_by_id,promoted_by_name,reason) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, officer_id, `${officer.first_name} ${officer.last_name}`, officer.callsign, officer.department, officer.rank, to_rank, req.user.id, issuerName, reason || '');

  // Actually update the officer's rank
  db.prepare('UPDATE officers SET rank=? WHERE id=?').run(to_rank, officer_id);

  res.status(201).json(db.prepare('SELECT * FROM promotions WHERE id=?').get(id));
});

// DELETE /api/promotions/:id — remove record (does not reverse rank)
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM promotions WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
