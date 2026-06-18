const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/stats/personal — stats for the logged-in officer
router.get('/personal', (req, res) => {
  const id = req.user.id;

  const shiftStats = db.prepare(`
    SELECT
      COUNT(*) as total_shifts,
      COALESCE(SUM(duration_mins),0) as total_mins,
      COALESCE(SUM(CASE WHEN DATE(start_time) >= DATE('now','-30 days') THEN duration_mins ELSE 0 END),0) as month_mins
    FROM shifts WHERE officer_id = ? AND status = 'completed'
  `).get(id);

  const incidents = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE primary_officer = ?").get(id);
  const warrants  = db.prepare("SELECT COUNT(*) as c FROM warrants WHERE issued_by = ?").get(id);
  const arrests   = db.prepare("SELECT COUNT(*) as c FROM arrest_reports WHERE arresting_officer = ?").get(id);
  const reports   = db.prepare("SELECT COUNT(*) as c FROM reports WHERE officer_id = ?").get(id);
  const certs     = db.prepare("SELECT COUNT(*) as c FROM cert_applications WHERE officer_id = ? AND status = 'approved'").get(id);
  const strikes   = db.prepare("SELECT COUNT(*) as c FROM strikes WHERE officer_id = ? AND status = 'active'").get(id);

  // Last 7 shifts for hours chart
  const recentShifts = db.prepare(`
    SELECT DATE(start_time) as day, COALESCE(SUM(duration_mins),0) as mins
    FROM shifts WHERE officer_id = ? AND status = 'completed' AND start_time >= DATE('now','-7 days')
    GROUP BY DATE(start_time)
    ORDER BY day ASC
  `).all(id);

  // Last 5 promotions
  const promotionHistory = db.prepare(`
    SELECT from_rank, to_rank, effective_date, reason FROM promotions WHERE officer_id = ? ORDER BY effective_date DESC LIMIT 5
  `).all(id);

  res.json({
    total_shifts:   shiftStats.total_shifts,
    total_hours:    Math.round(shiftStats.total_mins / 60 * 10) / 10,
    month_hours:    Math.round(shiftStats.month_mins / 60 * 10) / 10,
    incidents:      incidents.c,
    warrants_issued: warrants.c,
    arrests:        arrests.c,
    reports:        reports.c,
    certifications: certs.c,
    active_strikes: strikes.c,
    recent_shifts:  recentShifts,
    promotions:     promotionHistory,
  });
});

// GET /api/stats/department — department-level stats for leadership
router.get('/department', (req, res) => {
  const byDept = db.prepare(`
    SELECT department,
      COUNT(*) as total,
      SUM(CASE WHEN status != 'off_duty' THEN 1 ELSE 0 END) as on_duty
    FROM officers WHERE username != 'admin' GROUP BY department ORDER BY department
  `).all();

  const byRank = db.prepare(`
    SELECT rank, COUNT(*) as total FROM officers WHERE username != 'admin' GROUP BY rank ORDER BY total DESC LIMIT 10
  `).all();

  const recentPromotions = db.prepare(`
    SELECT * FROM promotions
    ORDER BY created_at DESC LIMIT 10
  `).all();

  res.json({ by_department: byDept, by_rank: byRank, recent_promotions: recentPromotions });
});

// GET /api/stats/officer/:id — view any officer's stats (leadership only)
router.get('/officer/:id', (req, res) => {
  const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });

  const id = req.params.id;
  const officer = db.prepare("SELECT first_name, last_name, rank, department, callsign, status, created_at, last_login FROM officers WHERE id=?").get(id);
  if (!officer) return res.status(404).json({ error: 'Officer not found' });

  const shiftStats = db.prepare(`
    SELECT
      COUNT(*) as total_shifts,
      COALESCE(SUM(duration_mins),0) as total_mins,
      COALESCE(SUM(CASE WHEN DATE(start_time) >= DATE('now','-30 days') THEN duration_mins ELSE 0 END),0) as month_mins
    FROM shifts WHERE officer_id = ? AND status = 'completed'
  `).get(id);

  const incidents = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE primary_officer = ?").get(id);
  const warrants  = db.prepare("SELECT COUNT(*) as c FROM warrants WHERE issued_by = ?").get(id);
  const arrests   = db.prepare("SELECT COUNT(*) as c FROM arrest_reports WHERE arresting_officer = ?").get(id);
  const reports   = db.prepare("SELECT COUNT(*) as c FROM reports WHERE officer_id = ?").get(id);
  const certs     = db.prepare("SELECT COUNT(*) as c FROM cert_applications WHERE officer_id = ? AND status = 'approved'").get(id);
  const strikes   = db.prepare("SELECT COUNT(*) as c FROM strikes WHERE officer_id = ? AND status = 'active'").get(id);

  res.json({
    ...officer,
    total_shifts:    shiftStats.total_shifts,
    total_hours:     Math.round(shiftStats.total_mins / 60 * 10) / 10,
    month_hours:     Math.round(shiftStats.month_mins / 60 * 10) / 10,
    incidents:       incidents.c,
    warrants_issued: warrants.c,
    arrests:         arrests.c,
    reports:         reports.c,
    certifications:  certs.c,
    active_strikes:  strikes.c,
  });
});

// GET /api/stats/admin — all table counts for DatabaseStats (leadership only)
router.get('/admin', (req, res) => {
  const LEADERSHIP = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Leadership only' });
  const counts = {
    officers:           db.prepare("SELECT COUNT(*) as c FROM officers").get().c,
    citizens:           db.prepare("SELECT COUNT(*) as c FROM citizens").get().c,
    vehicles:           db.prepare("SELECT COUNT(*) as c FROM vehicles").get().c,
    warrants_active:    db.prepare("SELECT COUNT(*) as c FROM warrants WHERE status='active'").get().c,
    warrants_total:     db.prepare("SELECT COUNT(*) as c FROM warrants").get().c,
    bolos_active:       db.prepare("SELECT COUNT(*) as c FROM bolos WHERE status='active'").get().c,
    incidents_total:    db.prepare("SELECT COUNT(*) as c FROM incidents").get().c,
    incidents_open:     db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='open'").get().c,
    dispatch_active:    db.prepare("SELECT COUNT(*) as c FROM dispatch_calls WHERE status='active'").get().c,
    dispatch_total:     db.prepare("SELECT COUNT(*) as c FROM dispatch_calls").get().c,
    arrest_reports:     db.prepare("SELECT COUNT(*) as c FROM arrest_reports").get().c,
    reports:            db.prepare("SELECT COUNT(*) as c FROM reports").get().c,
    shifts_total:       db.prepare("SELECT COUNT(*) as c FROM shifts").get().c,
    leave_pending:      db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status='pending'").get().c,
    cert_pending:       db.prepare("SELECT COUNT(*) as c FROM cert_applications WHERE status='pending'").get().c,
    strikes_active:     db.prepare("SELECT COUNT(*) as c FROM strikes WHERE status='active'").get().c,
    promotions_total:   db.prepare("SELECT COUNT(*) as c FROM promotions").get().c,
    weapons_total:      db.prepare("SELECT COUNT(*) as c FROM weapons").get().c,
    fpos_active:        db.prepare("SELECT COUNT(*) as c FROM fpos WHERE status='active'").get().c,
    terminations_pending: db.prepare("SELECT COUNT(*) as c FROM terminations WHERE status='pending'").get().c,
    transfers_pending:  db.prepare("SELECT COUNT(*) as c FROM division_transfers WHERE status='pending'").get().c,
    announcements:      db.prepare("SELECT COUNT(*) as c FROM announcements").get().c,
    applications_pending: db.prepare("SELECT COUNT(*) as c FROM applications WHERE status='pending'").get().c,
  };

  const recent = db.prepare(`
    SELECT al.*, o.first_name || ' ' || o.last_name as officer_name, COALESCE(o.callsign, o.username) as callsign
    FROM activity_log al LEFT JOIN officers o ON al.officer_id = o.id
    ORDER BY al.created_at DESC LIMIT 20
  `).all();

  res.json({ counts, recent_activity: recent });
});

module.exports = router;
