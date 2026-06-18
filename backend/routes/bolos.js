const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const OFFICER_ROLES = ['commissioner','admin','administrator','leadership','senior_command','supervisor','officer','probationary_constable','constable','first_constable','senior_constable','leading_senior_constable','sergeant','senior_sergeant','inspector','superintendent','commander','assistant_commissioner','deputy_commissioner','commissioner'];

router.use(authenticateToken);

router.get('/', (req, res) => {
  const { status = 'active' } = req.query;
  const bolos = db.prepare(`
    SELECT b.*, c.first_name || ' ' || c.last_name as citizen_name, COALESCE(o.callsign, o.username) as officer_callsign, o.first_name || ' ' || o.last_name as officer_name
    FROM bolos b
    LEFT JOIN citizens c ON b.citizen_id = c.id
    LEFT JOIN officers o ON b.issued_by = o.id
    WHERE b.status = ?
    ORDER BY b.created_at DESC
  `).all(status);
  res.json({ bolos });
});

router.post('/', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  const { type, subject, description, plate, vehicle_description, citizen_id, armed, dangerous, expires_at } = req.body;
  if (!type || !subject || !description) return res.status(400).json({ error: 'type, subject, description required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO bolos (id, type, subject, description, plate, vehicle_description, citizen_id, armed, dangerous, status, issued_by, expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, type, subject, description, plate, vehicle_description, citizen_id, armed ? 1 : 0, dangerous ? 1 : 0, 'active', req.user.id, expires_at
  );
  const bolo = db.prepare('SELECT * FROM bolos WHERE id = ?').get(id);
  res.status(201).json(bolo);
});

router.put('/:id/cancel', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  db.prepare("UPDATE bolos SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ id: req.params.id, status: 'cancelled' });
});

module.exports = router;
