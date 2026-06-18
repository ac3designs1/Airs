const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

const CHECKLIST = [
  { id: 'ob_01', name: 'Welcome & Orientation Briefing',        desc: 'Initial welcome session covering department culture, values, and chain of command.' },
  { id: 'ob_02', name: 'Server Rules & Code of Conduct',        desc: 'Review and acknowledgement of all Next RP server rules and officer conduct standards.' },
  { id: 'ob_03', name: 'Police Procedures & SOPs Overview',     desc: 'Standard operating procedures for general policing, escalation, and use of force.' },
  { id: 'ob_04', name: 'Radio & Communication Standards',       desc: 'Proper radio etiquette, codes, call-signs, and dispatch communication.' },
  { id: 'ob_05', name: 'In-Game Academy Orientation (HQ Tour)', desc: 'Physical tour of police HQ, equipment lockers, patrol vehicles, and facilities.' },
  { id: 'ob_06', name: 'Supervised Patrol — Ride-Along',        desc: 'Minimum one supervised patrol shift alongside a senior officer or FTO.' },
  { id: 'ob_07', name: 'Traffic Stop & Pursuit Procedures',     desc: 'Hands-on training for conducting lawful traffic stops and vehicle pursuits.' },
  { id: 'ob_08', name: 'Arrest & Custody Procedures',           desc: 'Lawful arrest, Miranda/caution, custody, and processing procedures.' },
  { id: 'ob_09', name: 'Final Assessment with FTO/Leadership',  desc: 'Formal final assessment completed and signed off by FTO or Senior Leadership.' },
  { id: 'ob_10', name: 'Callsign & Equipment Assignment',       desc: 'Official callsign, uniform, and equipment issued. Officer activated in system.' },
];

// ── GET /api/onboarding/checklist — public list of items ──────
router.get('/checklist', authenticateToken, (req, res) => {
  res.json(CHECKLIST);
});

// ── GET /api/onboarding — leadership: all recruits in training ─
router.get('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const recruits = db.prepare(`
    SELECT id, first_name, last_name, callsign, rank, department, discord_username, created_at,
           COALESCE(onboarding_complete, 0) as onboarding_complete,
           onboarding_activated_by, onboarding_activated_at
    FROM officers
    WHERE (role = 'recruit' OR rank = 'Recruit')
      AND username != 'admin'
    ORDER BY created_at DESC
  `).all();
  res.json(recruits);
});

// ── GET /api/onboarding/:id — get one recruit's checklist progress ─
router.get('/:id', authenticateToken, (req, res) => {
  const isLeadership = LEADERSHIP.includes(req.user.role);
  const isSelf = req.user.id === req.params.id;
  if (!isLeadership && !isSelf) return res.status(403).json({ error: 'Forbidden' });

  const officer = db.prepare('SELECT id,first_name,last_name,callsign,rank,department,COALESCE(onboarding_complete,0) as onboarding_complete,onboarding_activated_by,onboarding_activated_at FROM officers WHERE id=?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  const progress = db.prepare('SELECT * FROM recruit_progress WHERE officer_id = ?').all(req.params.id);

  const items = CHECKLIST.map(item => {
    const row = progress.find(p => p.stage_id === item.id);
    return {
      ...item,
      status:         row?.status ?? 'not_started',
      notes:          row?.notes ?? '',
      updated_by_name: row?.updated_by_name ?? null,
      completed_at:   row?.completed_at ?? null,
    };
  });

  const completedCount = items.filter(i => i.status === 'completed').length;
  res.json({ officer, items, completedCount, total: CHECKLIST.length });
});

// ── PUT /api/onboarding/:id/item — mark / unmark a checklist item ─
router.put('/:id/item', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { stage_id, status, notes } = req.body;
  if (!stage_id || !['completed', 'not_started', 'in_progress'].includes(status)) {
    return res.status(400).json({ error: 'Invalid stage_id or status' });
  }

  const officer = db.prepare('SELECT id FROM officers WHERE id=?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Recruit not found' });

  const updaterName = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO recruit_progress (id, officer_id, stage_id, stage_name, status, notes, updated_by_id, updated_by_name, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(officer_id, stage_id) DO UPDATE SET
      status=excluded.status, notes=excluded.notes,
      updated_by_id=excluded.updated_by_id, updated_by_name=excluded.updated_by_name,
      completed_at=excluded.completed_at
  `).run(
    uuidv4(), req.params.id, stage_id,
    CHECKLIST.find(c => c.id === stage_id)?.name ?? stage_id,
    status, notes ?? '', req.user.id, updaterName, completedAt,
  );

  res.json({ ok: true });
});

// ── POST /api/onboarding/:id/activate — complete training & activate officer ─
router.post('/:id/activate', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  const officer = db.prepare('SELECT * FROM officers WHERE id=?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  const activatorName = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;

  db.prepare(`
    UPDATE officers
    SET onboarding_complete=1, onboarding_activated_by=?, onboarding_activated_at=datetime('now')
    WHERE id=?
  `).run(activatorName, req.params.id);

  db.prepare('INSERT INTO activity_log (id, officer_id, action, details) VALUES (?, ?, ?, ?)').run(
    uuidv4(), req.params.id,
    'TRAINING_COMPLETE',
    `Initial training completed and officer activated by ${activatorName}`,
  );

  res.json({ message: 'Officer activated', officer_id: req.params.id });
});

// ── POST /api/onboarding/:id/deactivate — revert back to training ─
router.post('/:id/deactivate', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE officers SET onboarding_complete=0, onboarding_activated_by=NULL, onboarding_activated_at=NULL WHERE id=?').run(req.params.id);
  res.json({ message: 'Officer returned to training' });
});

module.exports = router;
