const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

router.get('/', (req, res) => {
  const { status = 'active' } = req.query;
  const rows = db.prepare(`
    SELECT f.*, o.first_name || ' ' || o.last_name as officer_name, o.rank, o.department, o.callsign as officer_callsign
    FROM fpos f JOIN officers o ON f.officer_id = o.id
    WHERE f.status = ?
    ORDER BY f.issued_date DESC
  `).all(status);
  res.json({ fpos: rows });
});

router.post('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { officer_id, expiry_date, notes } = req.body;
  if (!officer_id) return res.status(400).json({ error: 'officer_id required' });
  const o = db.prepare('SELECT * FROM officers WHERE id = ?').get(officer_id);
  if (!o) return res.status(404).json({ error: 'Officer not found' });
  const year = new Date().getFullYear();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM fpos").get().c;
  const cert_number = `FPO-${year}-${String(cnt + 1).padStart(3, '0')}`;
  const id = uuidv4();
  db.prepare(`INSERT INTO fpos (id,officer_id,officer_name,officer_callsign,department,rank,issued_by_id,issued_by_name,cert_number,expiry_date,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, officer_id, `${o.first_name} ${o.last_name}`, o.callsign ?? o.username, o.department, o.rank,
    req.user.id, `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username, cert_number, expiry_date || null, notes || null
  );
  res.status(201).json(db.prepare('SELECT * FROM fpos WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { status, notes, expiry_date } = req.body;
  db.prepare('UPDATE fpos SET status=?,notes=?,expiry_date=? WHERE id=?').run(
    status || 'active', notes || null, expiry_date || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM fpos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM fpos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
