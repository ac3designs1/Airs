const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

// GET /api/recruit-progress/:officer_id
// Leadership can view any recruit's progress; others can only view their own
router.get('/:officer_id', (req, res) => {
  const isLeader = LEADERSHIP.includes(req.user.role);
  if (!isLeader && req.user.id !== req.params.officer_id) {
    return res.status(403).json({ error: 'You can only view your own training progress' });
  }
  const rows = db.prepare('SELECT * FROM recruit_progress WHERE officer_id = ?').all(req.params.officer_id);
  const map = {};
  rows.forEach(r => { map[r.stage_id] = r; });
  res.json({ progress: map });
});

// POST /api/recruit-progress — upsert a single stage entry
router.post('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const { officer_id, stage_id, stage_name, status, notes } = req.body;
  if (!officer_id || !stage_id || !status) return res.status(400).json({ error: 'officer_id, stage_id and status required' });

  const VALID = ['not_started', 'in_progress', 'completed', 'failed'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const id = uuidv4();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO recruit_progress (id, officer_id, stage_id, stage_name, status, notes, updated_by_id, updated_by_name, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(officer_id, stage_id) DO UPDATE SET
      status = excluded.status,
      stage_name = excluded.stage_name,
      notes = excluded.notes,
      updated_by_id = excluded.updated_by_id,
      updated_by_name = excluded.updated_by_name,
      completed_at = CASE WHEN excluded.status = 'completed' THEN excluded.completed_at ELSE recruit_progress.completed_at END
  `).run(
    id, officer_id, stage_id, stage_name || stage_id, status,
    notes || null, req.user.id, `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username, completedAt
  );

  const row = db.prepare('SELECT * FROM recruit_progress WHERE officer_id = ? AND stage_id = ?').get(officer_id, stage_id);
  res.json(row);
});

module.exports = router;
