const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

// GET /api/rewards
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM rewards ORDER BY date DESC, created_at DESC').all());
});

// POST /api/rewards
router.post('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { officer_id, officer_name, callsign, category, title, description, date } = req.body;
  if (!officer_name || !category || !title) return res.status(400).json({ error: 'officer_name, category and title required' });
  const id = uuidv4();
  const issuer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const issued_by = issuer ? `${issuer.first_name} ${issuer.last_name}` : req.user.username;
  db.prepare(`
    INSERT INTO rewards (id, officer_id, officer_name, callsign, category, title, description, issued_by_id, issued_by, date)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(id, officer_id || null, officer_name, callsign || null, category, title, description || '', req.user.id, issued_by, date || new Date().toISOString().split('T')[0]);
  res.status(201).json(db.prepare('SELECT * FROM rewards WHERE id=?').get(id));
});

// DELETE /api/rewards/:id
router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM rewards WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
