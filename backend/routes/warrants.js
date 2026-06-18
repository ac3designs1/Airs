const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Roles that can perform operational MDT actions (not recruits)
const OFFICER_ROLES = ['admin','administrator','leadership','senior_command','supervisor','officer','probationary_constable','constable','first_constable','senior_constable','leading_senior_constable','sergeant','senior_sergeant','inspector','superintendent','commander','assistant_commissioner','deputy_commissioner','commissioner'];
const LEADERSHIP = ['admin','administrator','leadership','senior_command','supervisor'];

router.use(authenticateToken);

router.get('/', (req, res) => {
  const { status = 'active' } = req.query;
  const warrants = db.prepare(`
    SELECT w.*, c.first_name || ' ' || c.last_name as citizen_name, c.dob, COALESCE(o.callsign, o.username) || ' ' || o.first_name || ' ' || o.last_name as officer_name
    FROM warrants w
    LEFT JOIN citizens c ON w.citizen_id = c.id
    LEFT JOIN officers o ON w.issued_by = o.id
    WHERE w.status = ?
    ORDER BY w.issued_date DESC
  `).all(status);
  res.json(warrants);
});

router.get('/:id', (req, res) => {
  const w = db.prepare('SELECT * FROM warrants WHERE id = ?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

router.post('/', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  const { citizen_id, type, charges, description, expiry_date, bail_amount } = req.body;
  if (!citizen_id || !type || !charges) return res.status(400).json({ error: 'citizen_id, type, and charges required' });

  const id = uuidv4();
  db.prepare(`INSERT INTO warrants (id, citizen_id, type, charges, description, status, issued_by, expiry_date, bail_amount) VALUES (?,?,?,?,?,?,?,?,?)`).run(
    id, citizen_id, type, JSON.stringify(charges), description, 'active', req.user.id, expiry_date, bail_amount
  );
  const w = db.prepare('SELECT * FROM warrants WHERE id = ?').get(id);
  res.status(201).json(w);
});

router.put('/:id', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  const { status } = req.body;
  const allowed = ['active', 'served', 'cancelled', 'expired'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE warrants SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ id: req.params.id, status });
});

router.put('/:id/status', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  const { status } = req.body;
  const allowed = ['active', 'served', 'cancelled', 'expired'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE warrants SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ id: req.params.id, status });
});

module.exports = router;
