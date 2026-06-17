const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

function genCaseNumber() {
  const year = new Date().getFullYear();
  const existing = db.prepare("SELECT COUNT(*) as cnt FROM incidents WHERE case_number LIKE ?").get(`${year}%`);
  const seq = String(existing.cnt + 1).padStart(5, '0');
  return `${year}-${seq}`;
}

router.get('/', (req, res) => {
  const { q, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (q) { where.push('(i.title LIKE ? OR i.case_number LIKE ? OR i.location LIKE ?)'); const s = `%${q}%`; params.push(s, s, s); }
  if (status) { where.push('i.status = ?'); params.push(status); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const incidents = db.prepare(`
    SELECT i.*, o.first_name || ' ' || o.last_name as officer_name, COALESCE(o.callsign, o.username) as officer_callsign
    FROM incidents i
    LEFT JOIN officers o ON i.primary_officer = o.id
    ${whereClause}
    ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  res.json({ incidents });
});

router.get('/:id', (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  res.json(incident);
});

router.post('/', (req, res) => {
  const { title, description, location, type, narrative, involved_citizens, involved_vehicles, involved_officers, charges } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const id = uuidv4();
  const case_number = genCaseNumber();

  db.prepare(`INSERT INTO incidents (id, case_number, title, description, location, type, primary_officer, involved_citizens, involved_vehicles, involved_officers, charges, narrative) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, case_number, title, description, location, type, req.user.id,
    JSON.stringify(involved_citizens || []),
    JSON.stringify(involved_vehicles || []),
    JSON.stringify(involved_officers || []),
    JSON.stringify(charges || []),
    narrative
  );

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  res.status(201).json(incident);
});

router.put('/:id', (req, res) => {
  const { title, description, location, type, status, narrative, involved_citizens, involved_vehicles, charges } = req.body;
  db.prepare(`UPDATE incidents SET title=?,description=?,location=?,type=?,status=?,narrative=?,involved_citizens=?,involved_vehicles=?,charges=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    title, description, location, type, status, narrative,
    JSON.stringify(involved_citizens || []),
    JSON.stringify(involved_vehicles || []),
    JSON.stringify(charges || []),
    req.params.id
  );
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  res.json(incident);
});

// Arrest reports
router.get('/arrests/list', (req, res) => {
  const arrests = db.prepare(`
    SELECT ar.*, c.first_name || ' ' || c.last_name as citizen_name, COALESCE(o.callsign, o.username) || ' ' || o.first_name || ' ' || o.last_name as officer_name
    FROM arrest_reports ar
    LEFT JOIN citizens c ON ar.citizen_id = c.id
    LEFT JOIN officers o ON ar.arresting_officer = o.id
    ORDER BY ar.created_at DESC
  `).all();
  res.json({ arrests });
});

router.post('/arrests', (req, res) => {
  const { citizen_id, charges, narrative, location, bail_amount, jail_time, fine_amount } = req.body;
  if (!citizen_id || !charges) return res.status(400).json({ error: 'citizen_id and charges required' });

  const id = uuidv4();
  const year = new Date().getFullYear();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM arrest_reports WHERE case_number LIKE ?").get(`AR-${year}%`).c;
  const case_number = `AR-${year}-${String(cnt + 1).padStart(4, '0')}`;

  db.prepare(`INSERT INTO arrest_reports (id, case_number, citizen_id, arresting_officer, charges, narrative, location, bail_amount, jail_time, fine_amount) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, case_number, citizen_id, req.user.id, JSON.stringify(charges), narrative, location, bail_amount, jail_time, fine_amount
  );

  const arrest = db.prepare('SELECT * FROM arrest_reports WHERE id = ?').get(id);
  res.status(201).json(arrest);
});

module.exports = router;
