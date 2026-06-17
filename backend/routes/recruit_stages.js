const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

// GET /api/recruit-stages — all records (or for a specific recruit)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM recruit_stages ORDER BY updated_at DESC').all();
  res.json(rows.map(r => ({ ...r, stage_statuses: JSON.parse(r.stage_statuses || '[]') })));
});

// GET /api/recruit-stages/:officer_id
router.get('/:officer_id', (req, res) => {
  const row = db.prepare('SELECT * FROM recruit_stages WHERE recruit_officer_id = ?').get(req.params.officer_id);
  if (!row) return res.json(null);
  res.json({ ...row, stage_statuses: JSON.parse(row.stage_statuses || '[]') });
});

// POST /api/recruit-stages — create or update a recruit's stage record
router.post('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { recruit_officer_id, recruit_name, callsign, fto_name, stage_index, stage_statuses } = req.body;
  if (!recruit_officer_id) return res.status(400).json({ error: 'recruit_officer_id required' });

  const existing = db.prepare('SELECT id FROM recruit_stages WHERE recruit_officer_id=?').get(recruit_officer_id);
  if (existing) {
    db.prepare(`UPDATE recruit_stages SET recruit_name=?, callsign=?, fto_name=?, stage_index=?, stage_statuses=?, updated_at=CURRENT_TIMESTAMP WHERE recruit_officer_id=?`)
      .run(recruit_name, callsign || null, fto_name || null, stage_index ?? 0, JSON.stringify(stage_statuses ?? []), recruit_officer_id);
  } else {
    db.prepare(`INSERT INTO recruit_stages (id, recruit_officer_id, recruit_name, callsign, fto_name, stage_index, stage_statuses) VALUES (?,?,?,?,?,?,?)`)
      .run(uuidv4(), recruit_officer_id, recruit_name, callsign || null, fto_name || null, stage_index ?? 0, JSON.stringify(stage_statuses ?? []));
  }
  const row = db.prepare('SELECT * FROM recruit_stages WHERE recruit_officer_id=?').get(recruit_officer_id);
  res.json({ ...row, stage_statuses: JSON.parse(row.stage_statuses || '[]') });
});

module.exports = router;
