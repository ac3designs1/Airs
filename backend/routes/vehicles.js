const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const OFFICER_ROLES = ['commissioner','admin','administrator','leadership','senior_command','supervisor','officer','probationary_constable','constable','first_constable','senior_constable','leading_senior_constable','sergeant','senior_sergeant','inspector','superintendent','commander','assistant_commissioner','deputy_commissioner','commissioner'];
const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];

router.use(authenticateToken);

router.get('/', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT v.*, c.first_name || ' ' || c.last_name as owner_name FROM vehicles v LEFT JOIN citizens c ON v.owner_id = c.id`;
  let params = [];

  if (q) {
    query += ` WHERE v.plate LIKE ? OR v.make LIKE ? OR v.model LIKE ?`;
    const s = `%${q}%`;
    params = [s, s, s];
  }

  query += ` ORDER BY v.plate ASC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const vehicles = db.prepare(query).all(...params);
  res.json({ vehicles });
});

router.get('/plate/:plate', (req, res) => {
  const vehicle = db.prepare(`SELECT v.*, c.first_name || ' ' || c.last_name as owner_name, c.license_status, c.id as citizen_id FROM vehicles v LEFT JOIN citizens c ON v.owner_id = c.id WHERE v.plate = ?`).get(req.params.plate.toUpperCase());
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
});

router.get('/:id', (req, res) => {
  const vehicle = db.prepare(`SELECT v.*, c.first_name || ' ' || c.last_name as owner_name FROM vehicles v LEFT JOIN citizens c ON v.owner_id = c.id WHERE v.id = ?`).get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  res.json(vehicle);
});

router.post('/', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  const { plate, make, model, year, color, vin, owner_id, registration_status, insurance_status, notes } = req.body;
  if (!plate) return res.status(400).json({ error: 'Plate required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO vehicles (id, plate, make, model, year, color, vin, owner_id, registration_status, insurance_status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, plate.toUpperCase(), make, model, year, color, vin, owner_id, registration_status || 'valid', insurance_status || 'valid', notes);
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  res.status(201).json(v);
});

router.put('/:id', (req, res) => {
  if (!OFFICER_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Active officers only' });
  const { plate, make, model, year, color, vin, owner_id, registration_status, insurance_status, stolen, impounded, notes, flags } = req.body;
  db.prepare(`UPDATE vehicles SET plate=?,make=?,model=?,year=?,color=?,vin=?,owner_id=?,registration_status=?,insurance_status=?,stolen=?,impounded=?,notes=?,flags=? WHERE id=?`).run(
    plate?.toUpperCase(), make, model, year, color, vin, owner_id, registration_status, insurance_status, stolen ? 1 : 0, impounded ? 1 : 0, notes, flags || '[]', req.params.id
  );
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
});

router.delete('/:id', (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
