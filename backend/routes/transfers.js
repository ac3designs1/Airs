const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

router.get('/', (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  let q = 'SELECT * FROM division_transfers';
  const p = [];
  if (!isLeader) { q += ' WHERE officer_id = ?'; p.push(req.user.id); }
  q += ' ORDER BY created_at DESC';
  res.json({ transfers: db.prepare(q).all(...p) });
});

router.post('/', (req, res) => {
  const { to_division, why_transfer, skills, time_in_current, long_term_goals } = req.body;
  if (!to_division) return res.status(400).json({ error: 'to_division required' });
  const u = req.user;
  const officer = db.prepare('SELECT first_name, last_name, callsign, department FROM officers WHERE id=?').get(u.id);
  const oName = officer ? `${officer.first_name} ${officer.last_name}` : (u.first_name ? `${u.first_name} ${u.last_name}` : u.username);
  const oCallsign = officer?.callsign ?? u.callsign ?? u.username;
  const oDept = officer?.department ?? u.department ?? 'Unknown';
  const id = uuidv4();
  db.prepare(`INSERT INTO division_transfers (id,officer_id,officer_name,officer_callsign,from_division,to_division,why_transfer,skills,time_in_current,long_term_goals) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, u.id, oName, oCallsign, oDept, to_division, why_transfer, skills, time_in_current, long_term_goals
  );
  res.status(201).json(db.prepare('SELECT * FROM division_transfers WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { status, review_notes } = req.body;
  const existing = db.prepare('SELECT * FROM division_transfers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE division_transfers SET status=?,review_notes=?,reviewed_by_id=?,reviewed_by_name=? WHERE id=?').run(
    status ?? existing.status, review_notes ?? existing.review_notes,
    req.user.id, `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username, req.params.id
  );
  if (status === 'approved') {
    db.prepare('UPDATE officers SET department=? WHERE id=?').run(existing.to_division, existing.officer_id);
  }
  res.json(db.prepare('SELECT * FROM division_transfers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM division_transfers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const isLeader = LEADERSHIP.includes(req.user.role);
  if (!isLeader && existing.officer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM division_transfers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
