const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

// GET /api/feedback
router.get('/', (req, res) => {
  const LEAD = LEADERSHIP.includes(req.user.role);
  // Leadership sees all; officers see their own
  const rows = LEAD
    ? db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM feedback WHERE officer_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows);
});

// POST /api/feedback — any officer can submit anonymously or attributed
router.post('/', (req, res) => {
  const { category, sentiment, message, department, anonymous } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  const id = uuidv4();
  const officer = anonymous ? null : req.user.id;
  let name = 'Anonymous';
  if (!anonymous) {
    const o = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
    name = o ? `${o.first_name} ${o.last_name}` : (req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.username);
  }
  db.prepare(`INSERT INTO feedback (id, officer_id, officer_name, category, sentiment, message, department) VALUES (?,?,?,?,?,?,?)`)
    .run(id, officer, name, category || 'General', sentiment || 'neutral', message, department || null);
  res.status(201).json(db.prepare('SELECT * FROM feedback WHERE id=?').get(id));
});

// PUT /api/feedback/:id — mark reviewed (leadership only)
router.put('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const reviewer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : (req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.username);
  db.prepare("UPDATE feedback SET status='reviewed', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(reviewerName, req.params.id);
  res.json(db.prepare('SELECT * FROM feedback WHERE id=?').get(req.params.id));
});

// DELETE /api/feedback/:id — leadership only
router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM feedback WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
