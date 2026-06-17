const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

// GET /api/fto-shifts
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM fto_shifts ORDER BY date DESC, created_at DESC').all();
  res.json(rows);
});

// POST /api/fto-shifts
router.post('/', (req, res) => {
  const { fto_officer_id, fto_name, recruit_officer_id, recruit_name, date, hours, type, notes } = req.body;
  if (!fto_name || !recruit_name || !date || !hours) return res.status(400).json({ error: 'fto_name, recruit_name, date and hours required' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO fto_shifts (id, fto_officer_id, fto_name, recruit_officer_id, recruit_name, date, hours, type, notes, logged_by_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(id, fto_officer_id || null, fto_name, recruit_officer_id || null, recruit_name, date, hours, type || 'Field Patrol', notes || '', req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM fto_shifts WHERE id=?').get(id));
});

// DELETE /api/fto-shifts/:id
router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM fto_shifts WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
