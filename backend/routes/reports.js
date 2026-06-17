const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

function genReportNumber() {
  const year = new Date().getFullYear();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM reports WHERE report_number LIKE ?").get(`RPT-${year}%`).c;
  return `RPT-${year}-${String(cnt + 1).padStart(4, '0')}`;
}

router.get('/', (req, res) => {
  const { q, type, status, page = 1, limit = 30 } = req.query;
  const isLeader = ['admin','administrator','leadership','senior_command','supervisor'].includes(req.user.role);
  const offset = (Number(page) - 1) * Number(limit);
  const where = [];
  const params = [];
  if (!isLeader) { where.push('r.officer_id = ?'); params.push(req.user.id); }
  if (q) { where.push('(r.title LIKE ? OR r.report_number LIKE ? OR r.content LIKE ?)'); const s = `%${q}%`; params.push(s, s, s); }
  if (type) { where.push('r.type = ?'); params.push(type); }
  if (status) { where.push('r.status = ?'); params.push(status); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT r.* FROM reports r ${w} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM reports r ${w}`).get(...params);
  res.json({ reports: rows, total: total.c });
});

router.post('/', (req, res) => {
  const { title, type, content, citizen_id, incident_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  const rn = genReportNumber();
  const o = req.user;
  const officer = db.prepare('SELECT first_name, last_name, callsign FROM officers WHERE id=?').get(o.id);
  const oName = officer ? `${officer.first_name} ${officer.last_name}` : (o.first_name ? `${o.first_name} ${o.last_name}` : o.username);
  const oCallsign = officer?.callsign ?? o.callsign ?? o.username;
  db.prepare(`INSERT INTO reports (id,report_number,title,type,officer_id,officer_name,officer_callsign,content,citizen_id,incident_id) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, rn, title, type || 'General', o.id, oName, oCallsign, content, citizen_id || null, incident_id || null
  );
  res.status(201).json(db.prepare('SELECT * FROM reports WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { title, type, content, status } = req.body;
  const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const isLeader = ['admin','administrator','leadership','senior_command','supervisor'].includes(req.user.role);
  if (!isLeader && existing.officer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare(`UPDATE reports SET title=?,type=?,content=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    title ?? existing.title, type ?? existing.type, content ?? existing.content, status ?? existing.status, req.params.id
  );
  res.json(db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const isLeader = ['admin','administrator','leadership','senior_command','supervisor'].includes(req.user.role);
  const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!isLeader && existing.officer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
