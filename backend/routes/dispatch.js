const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET /api/dispatch  (alias for /api/dispatch/calls for convenience)
router.get('/', (req, res) => {
  const { status, limit } = req.query;
  let query = 'SELECT * FROM dispatch_calls';
  const params = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY priority ASC, created_at DESC';
  if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }
  res.json(db.prepare(query).all(...params));
});

router.get('/calls', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM dispatch_calls';
  let params = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY priority ASC, created_at DESC';
  const calls = db.prepare(query).all(...params);
  res.json({ calls });
});

router.post('/calls', (req, res) => {
  const { type, description, location, priority, caller_name, caller_phone } = req.body;
  if (!type || !location) return res.status(400).json({ error: 'type and location required' });

  const id = uuidv4();
  const year = new Date().getFullYear();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM dispatch_calls WHERE call_number LIKE ?").get(`CS-${year}%`).c;
  const call_number = `CS-${year}-${String(cnt + 1).padStart(4, '0')}`;

  db.prepare(`INSERT INTO dispatch_calls (id, call_number, type, description, location, priority, status, caller_name, caller_phone) VALUES (?,?,?,?,?,?,?,?,?)`).run(
    id, call_number, type, description, location, priority || 3, 'pending', caller_name, caller_phone
  );

  const call = db.prepare('SELECT * FROM dispatch_calls WHERE id = ?').get(id);

  // Emit via socket if available
  if (req.app.get('io')) {
    req.app.get('io').emit('new_call', call);
  }

  res.status(201).json(call);
});

router.put('/calls/:id', (req, res) => {
  const { status, assigned_units, priority, description } = req.body;
  const call = db.prepare('SELECT * FROM dispatch_calls WHERE id = ?').get(req.params.id);
  if (!call) return res.status(404).json({ error: 'Not found' });

  let existingUnits = [];
  try { existingUnits = JSON.parse(call.assigned_units || '[]'); } catch {}
  db.prepare(`UPDATE dispatch_calls SET status=?, assigned_units=?, priority=?, description=?, updated_at=CURRENT_TIMESTAMP ${status === 'closed' ? ', closed_at=CURRENT_TIMESTAMP' : ''} WHERE id=?`).run(
    status || call.status,
    JSON.stringify(assigned_units || existingUnits),
    priority || call.priority,
    description || call.description,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM dispatch_calls WHERE id = ?').get(req.params.id);
  if (req.app.get('io')) req.app.get('io').emit('call_updated', updated);
  res.json(updated);
});

router.get('/units', (req, res) => {
  const units = db.prepare("SELECT id, first_name, last_name, rank, department, status, callsign FROM officers WHERE status != 'off_duty' AND username != 'admin' ORDER BY department, callsign").all();
  res.json({ units });
});

router.get('/stats', (req, res) => {
  const totalOfficers = db.prepare("SELECT COUNT(*) as c FROM officers WHERE username != 'admin'").get().c;
  const onDuty = db.prepare("SELECT COUNT(*) as c FROM officers WHERE status != 'off_duty' AND username != 'admin'").get().c;
  const activeCalls = db.prepare("SELECT COUNT(*) as c FROM dispatch_calls WHERE status = 'active'").get().c;
  const pendingCalls = db.prepare("SELECT COUNT(*) as c FROM dispatch_calls WHERE status = 'pending'").get().c;
  const activeWarrants = db.prepare("SELECT COUNT(*) as c FROM warrants WHERE status = 'active'").get().c;
  const activeBolos = db.prepare("SELECT COUNT(*) as c FROM bolos WHERE status = 'active'").get().c;
  const todayIncidents = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE DATE(created_at) = DATE('now')").get().c;
  const totalCitizens = db.prepare("SELECT COUNT(*) as c FROM citizens").get().c;
  const recentActivity = db.prepare(`
    SELECT al.*, COALESCE(o.callsign, o.username) as officer_callsign, o.first_name || ' ' || o.last_name as officer_name
    FROM activity_log al
    LEFT JOIN officers o ON al.officer_id = o.id
    ORDER BY al.created_at DESC LIMIT 10
  `).all();

  res.json({
    total_officers: totalOfficers,
    on_duty: onDuty,
    active_calls: activeCalls,
    pending_calls: pendingCalls,
    active_warrants: activeWarrants,
    active_bolos: activeBolos,
    total_incidents: todayIncidents,
    total_citizens: totalCitizens,
    recent_activity: recentActivity,
  });
});

module.exports = router;
