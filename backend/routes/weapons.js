const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// GET /api/weapons
router.get('/', authenticateToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM weapons ORDER BY created_at DESC').all());
});

// POST /api/weapons — add weapon
router.post('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { serial, weapon_type, model, notes } = req.body;
  if (!serial || !weapon_type) return res.status(400).json({ error: 'serial and weapon_type required' });

  const dup = db.prepare('SELECT id FROM weapons WHERE serial=?').get(serial);
  if (dup) return res.status(409).json({ error: 'Serial number already exists' });

  const id = uuidv4();
  db.prepare(`INSERT INTO weapons (id,serial,weapon_type,model,notes) VALUES (?,?,?,?,?)`)
    .run(id, serial, weapon_type, model || '', notes || '');
  res.status(201).json(db.prepare('SELECT * FROM weapons WHERE id=?').get(id));
});

// PUT /api/weapons/:id — assign/unassign/update
router.put('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { officer_id, status, notes } = req.body;

  let officerName = null, callsign = null;
  if (officer_id) {
    const o = db.prepare('SELECT first_name, last_name, callsign FROM officers WHERE id=?').get(officer_id);
    if (!o) return res.status(404).json({ error: 'Officer not found' });
    officerName = `${o.first_name} ${o.last_name}`;
    callsign = o.callsign;
  }

  const weapon = db.prepare('SELECT * FROM weapons WHERE id=?').get(req.params.id);
  if (!weapon) return res.status(404).json({ error: 'Weapon not found' });

  const newStatus = status || (officer_id ? 'assigned' : officer_id === null ? 'available' : weapon.status);
  const issuedDate = officer_id && !weapon.assigned_to_id ? new Date().toISOString().split('T')[0] : weapon.issued_date;

  db.prepare(`UPDATE weapons SET assigned_to_id=?,assigned_to_name=?,assigned_callsign=?,status=?,issued_date=?,notes=? WHERE id=?`)
    .run(officer_id ?? null, officerName, callsign, newStatus, issuedDate, notes ?? weapon.notes, req.params.id);

  res.json(db.prepare('SELECT * FROM weapons WHERE id=?').get(req.params.id));
});

// DELETE /api/weapons/:id
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM weapons WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
