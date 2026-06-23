const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { v4: uuidv4 } = require('uuid');

// Simple API-key auth for FiveM server-to-server calls.
// Set FIVEM_API_KEY in your Railway environment variables.
function fivemAuth(req, res, next) {
    const key = req.headers['x-fivem-api-key'];
    if (!key || !process.env.FIVEM_API_KEY || key !== process.env.FIVEM_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
router.use(fivemAuth);

// POST /api/fivem/duty/start
// Called when an officer logs into the FiveM MDT.
// Body: { callsign, name, rank }
router.post('/duty/start', (req, res) => {
    const { callsign, name, rank } = req.body;
    if (!callsign) return res.status(400).json({ error: 'callsign required' });

    const officer = db.prepare("SELECT * FROM officers WHERE LOWER(callsign) = LOWER(?)").get(callsign);
    if (!officer) return res.status(404).json({ error: 'Officer not found in NextAirs — ensure callsigns match.' });

    const existing = db.prepare("SELECT id FROM shifts WHERE officer_id = ? AND status = 'active'").get(officer.id);
    if (existing) {
        db.prepare("UPDATE officers SET status = 'on_duty' WHERE id = ?").run(officer.id);
        return res.json({ message: 'Already on shift', shift_id: existing.id });
    }

    const id = uuidv4();
    db.prepare(`INSERT INTO shifts (id, officer_id, officer_name, callsign, department, start_time, status) VALUES (?, ?, ?, ?, ?, datetime('now'), 'active')`)
        .run(id, officer.id, `${officer.first_name} ${officer.last_name}`, officer.callsign, officer.department);

    db.prepare("UPDATE officers SET status = 'on_duty' WHERE id = ?").run(officer.id);

    res.status(201).json({ message: 'Shift started', shift_id: id });
});

// POST /api/fivem/duty/end
// Called when an officer logs out of the FiveM MDT.
// Body: { callsign }
router.post('/duty/end', (req, res) => {
    const { callsign } = req.body;
    if (!callsign) return res.status(400).json({ error: 'callsign required' });

    const officer = db.prepare("SELECT * FROM officers WHERE LOWER(callsign) = LOWER(?)").get(callsign);
    if (!officer) return res.status(404).json({ error: 'Officer not found' });

    const shift = db.prepare("SELECT * FROM shifts WHERE officer_id = ? AND status = 'active'").get(officer.id);
    if (!shift) {
        db.prepare("UPDATE officers SET status = 'off_duty' WHERE id = ?").run(officer.id);
        return res.json({ message: 'No active shift found, status set to off_duty' });
    }

    const mins = Math.round((Date.now() - new Date(shift.start_time).getTime()) / 60000);
    db.prepare("UPDATE shifts SET status = 'completed', end_time = datetime('now'), duration_mins = ? WHERE id = ?")
        .run(mins, shift.id);
    db.prepare("UPDATE officers SET status = 'off_duty' WHERE id = ?").run(officer.id);

    res.json({ message: 'Shift ended', duration_mins: mins });
});

// POST /api/fivem/duty/status
// Called when an officer changes their status in the FiveM MDT.
// Body: { callsign, status }  (FiveM status string e.g. "ON PATROL", "TRAFFIC STOP")
router.post('/duty/status', (req, res) => {
    const { callsign, status } = req.body;
    if (!callsign) return res.status(400).json({ error: 'callsign required' });

    const statusMap = {
        'ON PATROL': 'on_duty',
        'TRAFFIC STOP': 'busy',
        'ON SCENE': 'busy',
        'ENROUTE': 'busy',
        'BUSY': 'busy',
        'UNAVAILABLE': 'off_duty',
    };

    const officer = db.prepare("SELECT id FROM officers WHERE LOWER(callsign) = LOWER(?)").get(callsign);
    if (!officer) return res.status(404).json({ error: 'Officer not found' });

    db.prepare("UPDATE officers SET status = ? WHERE id = ?").run(statusMap[status] || 'on_duty', officer.id);

    res.json({ message: 'Status updated', mapped_status: statusMap[status] || 'on_duty' });
});

// POST /api/fivem/warrant
// Called when a warrant is issued from the FiveM MDT.
// Body: { suspectName, notes, officerCallsign }
router.post('/warrant', (req, res) => {
    const { suspectName, notes, officerCallsign } = req.body;
    if (!suspectName) return res.status(400).json({ error: 'suspectName required' });

    // Parse "Lastname, Firstname" (MDT format) or "Firstname Lastname"
    let firstName, lastName;
    const commaSplit = suspectName.split(', ');
    if (commaSplit.length >= 2) {
        lastName = commaSplit[0].trim();
        firstName = commaSplit[1].trim();
    } else {
        const parts = suspectName.split(' ');
        firstName = parts[0] || suspectName;
        lastName = parts.slice(1).join(' ') || '';
    }

    let citizen = db.prepare(
        "SELECT id FROM citizens WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)"
    ).get(firstName, lastName);

    let citizen_id;
    if (citizen) {
        citizen_id = citizen.id;
    } else {
        citizen_id = uuidv4();
        db.prepare("INSERT INTO citizens (id, first_name, last_name) VALUES (?, ?, ?)").run(citizen_id, firstName, lastName);
    }

    let issued_by = null;
    if (officerCallsign) {
        const o = db.prepare("SELECT id FROM officers WHERE LOWER(callsign) = LOWER(?)").get(officerCallsign);
        if (o) issued_by = o.id;
    }

    const id = uuidv4();
    db.prepare(
        "INSERT INTO warrants (id, citizen_id, type, charges, description, status, issued_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, citizen_id, 'Arrest', JSON.stringify(['Warrant For Arrest']), notes || '', 'active', issued_by);

    res.status(201).json({ message: 'Warrant created', warrant_id: id });
});

// POST /api/fivem/dispatch
// Push a FiveM-originated call to the NextAirs CAD board.
// Body: { type, description, location, priority }
router.post('/dispatch', (req, res) => {
    const { type, description, location, priority } = req.body;
    if (!type || !location) return res.status(400).json({ error: 'type and location required' });

    const id = uuidv4();
    const year = new Date().getFullYear();
    const cnt = db.prepare("SELECT COUNT(*) as c FROM dispatch_calls WHERE call_number LIKE ?").get(`CS-${year}%`).c;
    const call_number = `CS-${year}-${String(cnt + 1).padStart(4, '0')}`;

    db.prepare(
        "INSERT INTO dispatch_calls (id, call_number, type, description, location, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, call_number, type, description || '', location, priority || 3, 'active');

    res.status(201).json({ message: 'Dispatch call created', call_number });
});

module.exports = router;
