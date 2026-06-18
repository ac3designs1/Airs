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

// POST /api/recruit-stages/:officer_id/final-signoff
// Completes the Final Sign-Off stage and promotes the recruit to Probationary Constable
router.post('/:officer_id/final-signoff', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });

  const { officer_id } = req.params;
  const promoterName = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;

  const trainingRow = db.prepare('SELECT * FROM recruit_stages WHERE recruit_officer_id=?').get(officer_id);
  if (!trainingRow) return res.status(404).json({ error: 'No training record found for this recruit' });

  const officer = db.prepare('SELECT * FROM officers WHERE id=?').get(officer_id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });
  if (officer.role !== 'recruit') return res.status(400).json({ error: 'Officer is not a recruit' });

  // Mark all stages complete (defensive — make sure Final Sign-Off is marked too)
  const statuses = JSON.parse(trainingRow.stage_statuses || '[]');
  const completedStatuses = statuses.map(s => ({
    ...s,
    status: 'complete',
    date: s.date || new Date().toISOString().split('T')[0],
  }));
  const totalStages = completedStatuses.length;

  // Update training record
  db.prepare(`UPDATE recruit_stages SET stage_index=?, stage_statuses=?, updated_at=CURRENT_TIMESTAMP WHERE recruit_officer_id=?`)
    .run(totalStages - 1, JSON.stringify(completedStatuses), officer_id);

  // Promote officer: role → officer, rank → Probationary Constable
  const fromRank = officer.rank || 'Recruit';
  db.prepare(`UPDATE officers SET role='officer', rank='Probationary Constable' WHERE id=?`)
    .run(officer_id);

  // Log the promotion
  db.prepare(`
    INSERT INTO promotions (id, officer_id, officer_name, callsign, department, from_rank, to_rank, promoted_by_id, promoted_by_name, reason, effective_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,date('now'))
  `).run(
    uuidv4(),
    officer_id,
    `${officer.first_name} ${officer.last_name}`,
    officer.callsign || null,
    officer.department || null,
    fromRank,
    'Probationary Constable',
    req.user.id,
    promoterName,
    'FTO Programme Final Sign-Off'
  );

  const updatedTraining = db.prepare('SELECT * FROM recruit_stages WHERE recruit_officer_id=?').get(officer_id);
  const updatedOfficer  = db.prepare('SELECT id, first_name, last_name, rank, role, callsign, department FROM officers WHERE id=?').get(officer_id);

  res.json({
    training: { ...updatedTraining, stage_statuses: JSON.parse(updatedTraining.stage_statuses || '[]') },
    officer: updatedOfficer,
  });
});

module.exports = router;
