const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET /api/citizens - search citizens
router.get('/', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM citizens';
  let params = [];

  if (q) {
    query += ` WHERE first_name LIKE ? OR last_name LIKE ? OR id LIKE ?`;
    const search = `%${q}%`;
    params = [search, search, search];
  }

  query += ` ORDER BY last_name ASC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const citizens = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM citizens${q ? ' WHERE first_name LIKE ? OR last_name LIKE ? OR id LIKE ?' : ''}`).get(...(q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []));

  res.json({ citizens, total: total.count, page: Number(page), limit: Number(limit) });
});

// GET /api/citizens/:id
router.get('/:id', (req, res) => {
  const citizen = db.prepare('SELECT * FROM citizens WHERE id = ?').get(req.params.id);
  if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

  const vehicles = db.prepare('SELECT * FROM vehicles WHERE owner_id = ?').all(req.params.id);
  const warrants = db.prepare('SELECT w.*, o.first_name || \' \' || o.last_name as officer_name FROM warrants w LEFT JOIN officers o ON w.issued_by = o.id WHERE w.citizen_id = ?').all(req.params.id);
  const arrests = db.prepare('SELECT ar.*, o.first_name || \' \' || o.last_name as officer_name FROM arrest_reports ar LEFT JOIN officers o ON ar.arresting_officer = o.id WHERE ar.citizen_id = ?').all(req.params.id);
  const bolos = db.prepare('SELECT * FROM bolos WHERE citizen_id = ? AND status = ?').all(req.params.id, 'active');

  res.json({ ...citizen, vehicles, warrants, arrests, bolos });
});

// POST /api/citizens
router.post('/', (req, res) => {
  const { first_name, last_name, dob, gender, ethnicity, height, weight, eye_color, hair_color, address, phone, occupation, license_status, license_class, notes } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'First and last name required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO citizens (id, first_name, last_name, dob, gender, ethnicity, height, weight, eye_color, hair_color, address, phone, occupation, license_status, license_class, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, first_name, last_name, dob, gender, ethnicity, height, weight, eye_color, hair_color, address, phone, occupation, license_status || 'valid', license_class || 'B', notes);

  const citizen = db.prepare('SELECT * FROM citizens WHERE id = ?').get(id);
  res.status(201).json(citizen);
});

// PUT /api/citizens/:id
router.put('/:id', (req, res) => {
  const { first_name, last_name, dob, gender, ethnicity, height, weight, eye_color, hair_color, address, phone, occupation, license_status, license_class, notes, flags } = req.body;

  db.prepare(`
    UPDATE citizens SET first_name=?, last_name=?, dob=?, gender=?, ethnicity=?, height=?, weight=?,
    eye_color=?, hair_color=?, address=?, phone=?, occupation=?, license_status=?, license_class=?, notes=?, flags=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(first_name, last_name, dob, gender, ethnicity, height, weight, eye_color, hair_color, address, phone, occupation, license_status, license_class, notes, flags || '[]', req.params.id);

  const citizen = db.prepare('SELECT * FROM citizens WHERE id = ?').get(req.params.id);
  if (!citizen) return res.status(404).json({ error: 'Not found' });
  res.json(citizen);
});

// DELETE /api/citizens/:id — leadership only
router.delete('/:id', (req, res) => {
  const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  db.prepare('DELETE FROM citizens WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
