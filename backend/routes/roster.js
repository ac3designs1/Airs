const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];
router.use(authenticateToken);

router.get('/', (req, res) => {
  const { department } = req.query;
  let query = `SELECT id, username, first_name, last_name, rank, department, status, callsign, role, special_roles, created_at, last_login
    FROM officers WHERE username != 'admin'`;
  const params = [];
  if (department) { query += ' AND department = ?'; params.push(department); }
  query += ' ORDER BY department, rank, last_name';
  const rows = db.prepare(query).all(...params);
  rows.forEach(r => { try { r.special_roles = JSON.parse(r.special_roles || '[]'); } catch { r.special_roles = []; } });
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const officer = db.prepare('SELECT id, username, first_name, last_name, rank, department, status, callsign, role, special_roles, created_at, last_login FROM officers WHERE id = ?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });
  try { officer.special_roles = JSON.parse(officer.special_roles || '[]'); } catch { officer.special_roles = []; }
  res.json(officer);
});

router.post('/', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { callsign, username, password, first_name, last_name, rank, department, role } = req.body;
  if (!username || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 12);
  const auto_badge = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
  db.prepare(`INSERT INTO officers (id, badge_number, username, password, first_name, last_name, rank, department, role, callsign) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, auto_badge, username, hash, first_name, last_name, rank || 'Recruit', department || 'GD', role || 'recruit', callsign || null
  );
  const officer = db.prepare('SELECT id, username, first_name, last_name, rank, department, status, callsign, role FROM officers WHERE id = ?').get(id);
  res.status(201).json(officer);
});

// Self-service status update (any authenticated officer)
router.put('/status', (req, res) => {
  const { status } = req.body;
  const valid = ['on_duty', 'busy', 'off_duty'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE officers SET status = ? WHERE id = ?').run(status, req.user.id);
  res.json({ status });
});

// Full officer update — leadership can update any field including status
router.put('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const officer = db.prepare('SELECT * FROM officers WHERE id=?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Not found' });

  const { first_name, last_name, rank, department, role, callsign, status } = req.body;

  // Only admin-level (admin, administrator, commissioner) can assign the commissioner role
  const ADMIN_ROLES = ['commissioner', 'admin', 'administrator'];
  if (role === 'commissioner' && !ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin or above required to assign Commissioner role' });
  }

  db.prepare(`UPDATE officers SET first_name=?, last_name=?, rank=?, department=?, role=?, callsign=?, status=? WHERE id=?`).run(
    first_name  ?? officer.first_name,
    last_name   ?? officer.last_name,
    rank        ?? officer.rank,
    department  ?? officer.department,
    role        ?? officer.role,
    callsign    !== undefined ? callsign : officer.callsign,
    status      ?? officer.status,
    req.params.id
  );

  // Log the change if rank or role changed
  if ((rank && rank !== officer.rank) || (role && role !== officer.role)) {
    const editorRow = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
    const editor = editorRow ? `${editorRow.first_name} ${editorRow.last_name}` : (req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.username);
    const changes = [];
    if (rank && rank !== officer.rank) changes.push(`rank: ${officer.rank} → ${rank}`);
    if (role && role !== officer.role) changes.push(`role: ${officer.role} → ${role}`);
    db.prepare(`INSERT INTO activity_log (id, officer_id, action, details) VALUES (?,?,?,?)`)
      .run(uuidv4(), req.user.id, 'officer_updated', `${editor} updated ${officer.first_name} ${officer.last_name}: ${changes.join(', ')}`);
  }

  const updatedRaw = db.prepare('SELECT id, username, first_name, last_name, rank, department, status, callsign, role, special_roles, created_at, last_login FROM officers WHERE id = ?').get(req.params.id);
  if (updatedRaw) { try { updatedRaw.special_roles = JSON.parse(updatedRaw.special_roles || '[]'); } catch { updatedRaw.special_roles = []; } }
  res.json(updatedRaw);
});

// PUT /roster/:id/special-roles — add or remove a special role
const VALID_SPECIAL_ROLES = ['fto', 'senior_fto', 'cirt_fto', 'academy_leadership'];
router.put('/:id/special-roles', (req, res) => {
  const SENIOR = ['commissioner', 'admin', 'administrator', 'senior_command'];
  if (!SENIOR.includes(req.user.role)) return res.status(403).json({ error: 'Senior Command or above required' });
  const officer = db.prepare('SELECT id, first_name, last_name, special_roles FROM officers WHERE id=?').get(req.params.id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });
  const { action, role: specialRole } = req.body;
  if (!['add', 'remove'].includes(action) || !VALID_SPECIAL_ROLES.includes(specialRole)) {
    return res.status(400).json({ error: 'Invalid action or role' });
  }
  let roles;
  try { roles = JSON.parse(officer.special_roles || '[]'); } catch { roles = []; }
  if (action === 'add' && !roles.includes(specialRole)) roles.push(specialRole);
  if (action === 'remove') roles = roles.filter(r => r !== specialRole);
  db.prepare('UPDATE officers SET special_roles=? WHERE id=?').run(JSON.stringify(roles), officer.id);
  const editorRow = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
  const editor = editorRow ? `${editorRow.first_name} ${editorRow.last_name}` : req.user.username;
  db.prepare('INSERT INTO activity_log (id, officer_id, action, details) VALUES (?,?,?,?)')
    .run(uuidv4(), req.user.id, 'special_role_change',
      `${editor} ${action}ed special role "${specialRole}" ${action === 'add' ? 'to' : 'from'} ${officer.first_name} ${officer.last_name}`);
  res.json({ special_roles: roles });
});

// Commissioner-only: silently assign / revoke the commissioner role
// POST /roster/commissioner-assign  { officer_id, action: 'grant'|'revoke' }
router.post('/commissioner-assign', (req, res) => {
  if (req.user.role !== 'commissioner') {
    return res.status(403).json({ error: 'Commissioner only' });
  }
  const { officer_id, action } = req.body;
  if (!officer_id || !['grant', 'revoke'].includes(action)) {
    return res.status(400).json({ error: 'officer_id and action (grant|revoke) required' });
  }
  const officer = db.prepare('SELECT id, first_name, last_name FROM officers WHERE id=?').get(officer_id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });
  const newRole = action === 'grant' ? 'commissioner' : 'leadership';
  db.prepare('UPDATE officers SET role=? WHERE id=?').run(newRole, officer_id);
  db.prepare(`INSERT INTO activity_log (id, officer_id, action, details) VALUES (?,?,?,?)`)
    .run(uuidv4(), req.user.id, 'commissioner_role_change',
      `Commissioner ${action}ed commissioner role to ${officer.first_name} ${officer.last_name}`);
  res.json({ message: `Role ${action}ed`, new_role: newRole });
});

// Terminate/remove officer — logs before deleting
router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
  const officer = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.params.id);
  if (officer) {
    const editorRow = db.prepare('SELECT first_name, last_name FROM officers WHERE id=?').get(req.user.id);
    const editor = editorRow ? `${editorRow.first_name} ${editorRow.last_name}` : (req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.username);
    db.prepare(`INSERT INTO activity_log (id, officer_id, action, details) VALUES (?,?,?,?)`)
      .run(uuidv4(), req.user.id, 'officer_terminated', `${editor} removed officer ${officer.first_name} ${officer.last_name} from the roster`);
  }
  db.prepare('DELETE FROM officers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Officer removed' });
});

module.exports = router;
