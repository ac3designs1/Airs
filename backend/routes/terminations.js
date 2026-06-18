const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

router.get('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { status } = req.query;
  let q = 'SELECT * FROM terminations';
  const p = [];
  if (status) { q += ' WHERE status = ?'; p.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json({ terminations: db.prepare(q).all(...p) });
});

router.post('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { officer_id, reason, evidence } = req.body;
  if (!officer_id || !reason) return res.status(400).json({ error: 'officer_id and reason required' });
  const o = db.prepare('SELECT * FROM officers WHERE id = ?').get(officer_id);
  if (!o) return res.status(404).json({ error: 'Officer not found' });
  const requester = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : (req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.username);
  const id = uuidv4();
  db.prepare(`INSERT INTO terminations (id,officer_id,officer_name,officer_callsign,department,rank,reason,evidence,requested_by_id,requested_by_name) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, officer_id, `${o.first_name} ${o.last_name}`, o.callsign ?? '', o.department, o.rank,
    reason, evidence || '', req.user.id, requesterName
  );
  res.status(201).json(db.prepare('SELECT * FROM terminations WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { status, review_notes } = req.body;
  const existing = db.prepare('SELECT * FROM terminations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const reviewer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : (req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.username);
  db.prepare('UPDATE terminations SET status=?,review_notes=?,reviewed_by_id=?,reviewed_by_name=? WHERE id=?').run(
    status ?? existing.status, review_notes ?? existing.review_notes,
    req.user.id, reviewerName, req.params.id
  );
  // If approved — set officer status to terminated
  if (status === 'approved') {
    db.prepare("UPDATE officers SET status='terminated', role='terminated' WHERE id=?").run(existing.officer_id);
  }
  res.json(db.prepare('SELECT * FROM terminations WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM terminations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
