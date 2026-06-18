const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { db }  = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Ensure applications table has the discord columns regardless of load order
try { db.exec('ALTER TABLE applications ADD COLUMN discord_id TEXT'); } catch {}
try { db.exec('ALTER TABLE applications ADD COLUMN discord_username TEXT'); } catch {}
try { db.exec('ALTER TABLE applications ADD COLUMN discord_avatar TEXT'); } catch {}

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

// ── Shared: create a recruit officer from an approved application ─
function createRecruitFromApplication(app) {
  try {
    // Don't create if an officer already exists with this discord_id
    if (app.discord_id) {
      const exists = db.prepare('SELECT id FROM officers WHERE discord_id = ?').get(app.discord_id);
      if (exists) return exists.id;
    }

    const nameParts = (app.full_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'New';
    const lastName  = nameParts.slice(1).join(' ') || 'Officer';
    const ts        = Date.now().toString().slice(-6);
    const randomPwd = bcrypt.hashSync(uuidv4(), 10);

    // Unique username
    const baseUser = (app.discord_username || app.discord || `recruit_${ts}`)
      .toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 28);
    let finalUsername = baseUser;
    let n = 1;
    while (db.prepare('SELECT id FROM officers WHERE username = ?').get(finalUsername)) {
      finalUsername = `${baseUser}_${n++}`;
    }

    // Unique badge
    let badge = `RCT${ts}`;
    let bn = 1;
    while (db.prepare('SELECT id FROM officers WHERE badge_number = ?').get(badge)) {
      badge = `RCT${ts}${bn++}`;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO officers
        (id,badge_number,username,password,first_name,last_name,rank,department,role,status,callsign,discord_id,discord_username,avatar_url)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, badge, finalUsername, randomPwd,
      firstName, lastName, 'Recruit', 'Academy', 'recruit', 'off_duty',
      `RCT-${ts}`,
      app.discord_id || null, app.discord_username || null, app.discord_avatar || null,
    );
    console.log(`[Onboarding] Auto-created recruit officer for ${app.full_name} (${app.id})`);
    return id;
  } catch (err) {
    console.error('[Onboarding] Failed to create recruit:', err.message);
    return null;
  }
}

// ── Auto-sync: find approved applications with no officer, create them ─
function syncApprovedApplications() {
  try {
    const approved = db.prepare(
      "SELECT id, full_name, discord, discord_id, discord_username, discord_avatar FROM applications WHERE status = 'approved'"
    ).all();
    for (const app of approved) {
      // Check if there's already a recruit (or any) officer for this applicant
      let exists = false;
      if (app.discord_id) {
        exists = !!db.prepare('SELECT id FROM officers WHERE discord_id = ?').get(app.discord_id);
      }
      if (!exists) {
        // Try matching by name as a fallback (case-insensitive)
        const nameParts = (app.full_name || '').trim().split(/\s+/);
        if (nameParts.length >= 2) {
          const match = db.prepare(
            "SELECT id FROM officers WHERE LOWER(first_name)=LOWER(?) AND LOWER(last_name)=LOWER(?) AND role='recruit'"
          ).get(nameParts[0], nameParts.slice(1).join(' '));
          if (match) exists = true;
        }
      }
      if (!exists) {
        createRecruitFromApplication(app);
      }
    }
  } catch (err) {
    console.error('[Onboarding sync]', err.message);
  }
}

// ── GET /api/onboarding/checklist ─────────────────────────────
router.get('/checklist', authenticateToken, (_req, res) => {
  res.json(CHECKLIST);
});

// ── GET /api/onboarding — auto-sync then return all recruits ──
router.get('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    // Auto-heal: create any missing recruit officers from approved applications
    syncApprovedApplications();

    const recruits = db.prepare(`
      SELECT id, first_name, last_name, callsign, rank, department, discord_username, created_at,
             COALESCE(onboarding_complete, 0) as onboarding_complete,
             onboarding_activated_by, onboarding_activated_at
      FROM officers
      WHERE (role = 'recruit' OR rank = 'Recruit')
        AND username != 'admin'
      ORDER BY COALESCE(onboarding_complete, 0) ASC, created_at DESC
    `).all();
    res.json(recruits);
  } catch (err) {
    console.error('[GET /onboarding]', err.message);
    res.json([]);
  }
});

// ── GET /api/onboarding/all-officers — officer picker for manual add ─
router.get('/all-officers', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const officers = db.prepare(`
    SELECT id, first_name, last_name, callsign, rank, department, role
    FROM officers WHERE username != 'admin' AND role NOT IN ('terminated')
    ORDER BY first_name ASC
  `).all();
  res.json(officers);
});

// ── POST /api/onboarding/manual-add ───────────────────────────
router.post('/manual-add', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { officer_id } = req.body;
  if (!officer_id) return res.status(400).json({ error: 'officer_id required' });
  const officer = db.prepare('SELECT * FROM officers WHERE id = ?').get(officer_id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });

  db.prepare(`
    UPDATE officers SET rank='Recruit', role='recruit',
    onboarding_complete=0, onboarding_activated_by=NULL, onboarding_activated_at=NULL
    WHERE id=?
  `).run(officer_id);

  const updated = db.prepare(`
    SELECT id, first_name, last_name, callsign, rank, department, discord_username, created_at,
           COALESCE(onboarding_complete,0) as onboarding_complete
    FROM officers WHERE id=?
  `).get(officer_id);
  res.json(updated);
});

// ── GET /api/onboarding/:id — one recruit's checklist ─────────
router.get('/:id', authenticateToken, (req, res) => {
  const isLeadership = LEADERSHIP.includes(req.user.role);
  const isSelf = req.user.id === req.params.id;
  if (!isLeadership && !isSelf) return res.status(403).json({ error: 'Forbidden' });

  const officer = db.prepare(`
    SELECT id, first_name, last_name, callsign, rank, department,
           COALESCE(onboarding_complete,0) as onboarding_complete,
           onboarding_activated_by, onboarding_activated_at
    FROM officers WHERE id=?
  `).get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  const progress = db.prepare('SELECT * FROM recruit_progress WHERE officer_id=?').all(req.params.id);
  const items = CHECKLIST.map(item => {
    const row = progress.find(p => p.stage_id === item.id);
    return {
      ...item,
      status:          row?.status        ?? 'not_started',
      notes:           row?.notes         ?? '',
      updated_by_name: row?.updated_by_name ?? null,
      completed_at:    row?.completed_at  ?? null,
    };
  });

  res.json({ officer, items, completedCount: items.filter(i => i.status === 'completed').length, total: CHECKLIST.length });
});

// ── PUT /api/onboarding/:id/item — mark/unmark checklist item ──
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
    INSERT INTO recruit_progress (id,officer_id,stage_id,stage_name,status,notes,updated_by_id,updated_by_name,completed_at)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(officer_id,stage_id) DO UPDATE SET
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

// ── POST /api/onboarding/:id/activate ─────────────────────────
router.post('/:id/activate', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const officer = db.prepare('SELECT * FROM officers WHERE id=?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  const activatorName = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
  db.prepare(`
    UPDATE officers SET onboarding_complete=1, onboarding_activated_by=?, onboarding_activated_at=datetime('now')
    WHERE id=?
  `).run(activatorName, req.params.id);

  db.prepare('INSERT INTO activity_log (id,officer_id,action,details) VALUES (?,?,?,?)').run(
    uuidv4(), req.params.id, 'TRAINING_COMPLETE',
    `Initial training completed and officer activated by ${activatorName}`,
  );
  res.json({ message: 'Officer activated', officer_id: req.params.id });
});

// ── POST /api/onboarding/:id/deactivate ───────────────────────
router.post('/:id/deactivate', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE officers SET onboarding_complete=0, onboarding_activated_by=NULL, onboarding_activated_at=NULL WHERE id=?').run(req.params.id);
  res.json({ message: 'Officer returned to training' });
});

// ── Export sync so applications.js can reuse it ───────────────
module.exports = router;
module.exports.createRecruitFromApplication = createRecruitFromApplication;
