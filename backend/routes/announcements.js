const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command'];

// GET /api/announcements
router.get('/', authenticateToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC').all());
});

// POST /api/announcements — leadership only
router.post('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { title, content, category, pinned } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  const officer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const name = officer ? `${officer.first_name} ${officer.last_name}` : req.user.username;
  const id = uuidv4();

  db.prepare(`INSERT INTO announcements (id,title,content,category,author_id,author_name,pinned) VALUES (?,?,?,?,?,?,?)`)
    .run(id, title, content, category || 'general', req.user.id, name, pinned ? 1 : 0);

  res.status(201).json(db.prepare('SELECT * FROM announcements WHERE id=?').get(id));
});

// PUT /api/announcements/:id
router.put('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { title, content, category, pinned } = req.body;
  db.prepare(`UPDATE announcements SET title=?,content=?,category=?,pinned=?,updated_at=datetime('now') WHERE id=?`)
    .run(title, content, category || 'general', pinned ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM announcements WHERE id=?').get(req.params.id));
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
