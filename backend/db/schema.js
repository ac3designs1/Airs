const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new DatabaseSync(path.join(__dirname, 'nextairs.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS officers (
      id TEXT PRIMARY KEY,
      badge_number TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      rank TEXT NOT NULL DEFAULT 'Recruit',
      department TEXT NOT NULL DEFAULT 'Academy',
      status TEXT NOT NULL DEFAULT 'off_duty',
      callsign TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'officer',
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      dob TEXT,
      gender TEXT,
      ethnicity TEXT,
      height TEXT,
      weight TEXT,
      eye_color TEXT,
      hair_color TEXT,
      address TEXT,
      phone TEXT,
      occupation TEXT,
      license_status TEXT DEFAULT 'valid',
      license_class TEXT DEFAULT 'B',
      mugshot_url TEXT,
      notes TEXT,
      flags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate TEXT UNIQUE NOT NULL,
      make TEXT,
      model TEXT,
      year TEXT,
      color TEXT,
      vin TEXT,
      owner_id TEXT REFERENCES citizens(id),
      registration_status TEXT DEFAULT 'valid',
      insurance_status TEXT DEFAULT 'valid',
      flags TEXT DEFAULT '[]',
      stolen INTEGER DEFAULT 0,
      impounded INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warrants (
      id TEXT PRIMARY KEY,
      citizen_id TEXT REFERENCES citizens(id),
      type TEXT NOT NULL,
      charges TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      issued_by TEXT REFERENCES officers(id),
      issued_date TEXT DEFAULT (datetime('now')),
      expiry_date TEXT,
      bail_amount REAL
    );

    CREATE TABLE IF NOT EXISTS bolos (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      plate TEXT,
      vehicle_description TEXT,
      citizen_id TEXT REFERENCES citizens(id),
      armed INTEGER DEFAULT 0,
      dangerous INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      issued_by TEXT REFERENCES officers(id),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      type TEXT,
      status TEXT DEFAULT 'open',
      primary_officer TEXT REFERENCES officers(id),
      involved_citizens TEXT DEFAULT '[]',
      involved_vehicles TEXT DEFAULT '[]',
      involved_officers TEXT DEFAULT '[]',
      charges TEXT DEFAULT '[]',
      evidence TEXT DEFAULT '[]',
      narrative TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dispatch_calls (
      id TEXT PRIMARY KEY,
      call_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      location TEXT NOT NULL,
      priority INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      assigned_units TEXT DEFAULT '[]',
      caller_name TEXT,
      caller_phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS arrest_reports (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      citizen_id TEXT REFERENCES citizens(id),
      arresting_officer TEXT REFERENCES officers(id),
      charges TEXT NOT NULL DEFAULT '[]',
      narrative TEXT,
      location TEXT,
      bail_amount REAL,
      jail_time INTEGER,
      fine_amount REAL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      officer_id TEXT REFERENCES officers(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      callsign TEXT,
      department TEXT,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      duration_mins INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      callsign TEXT,
      department TEXT,
      leave_type TEXT NOT NULL DEFAULT 'annual',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      review_notes TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      author_id TEXT,
      author_name TEXT,
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cert_applications (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      callsign TEXT,
      cert_name TEXT NOT NULL,
      cert_category TEXT,
      why_interested TEXT,
      skills TEXT,
      goals TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      review_notes TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS strikes (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      callsign TEXT,
      department TEXT,
      issued_by_id TEXT,
      issued_by_name TEXT,
      reason TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'minor',
      status TEXT NOT NULL DEFAULT 'active',
      appeal_notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      callsign TEXT,
      department TEXT,
      from_rank TEXT NOT NULL,
      to_rank TEXT NOT NULL,
      promoted_by_id TEXT,
      promoted_by_name TEXT,
      reason TEXT,
      effective_date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weapons (
      id TEXT PRIMARY KEY,
      serial TEXT UNIQUE NOT NULL,
      weapon_type TEXT NOT NULL,
      model TEXT,
      assigned_to_id TEXT,
      assigned_to_name TEXT,
      assigned_callsign TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      issued_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      report_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'General',
      officer_id TEXT REFERENCES officers(id),
      officer_name TEXT,
      officer_callsign TEXT,
      content TEXT,
      status TEXT DEFAULT 'submitted',
      citizen_id TEXT,
      incident_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fpos (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL REFERENCES officers(id),
      officer_name TEXT,
      officer_callsign TEXT,
      department TEXT,
      rank TEXT,
      issued_by_id TEXT,
      issued_by_name TEXT,
      cert_number TEXT,
      status TEXT DEFAULT 'active',
      issued_date TEXT DEFAULT (date('now')),
      expiry_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS terminations (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      officer_callsign TEXT,
      department TEXT,
      rank TEXT,
      reason TEXT NOT NULL,
      evidence TEXT,
      requested_by_id TEXT,
      requested_by_name TEXT,
      reviewed_by_id TEXT,
      reviewed_by_name TEXT,
      status TEXT DEFAULT 'pending',
      review_notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS division_transfers (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL,
      officer_name TEXT,
      officer_callsign TEXT,
      from_division TEXT,
      to_division TEXT NOT NULL,
      why_transfer TEXT,
      skills TEXT,
      time_in_current TEXT,
      long_term_goals TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by_id TEXT,
      reviewed_by_name TEXT,
      review_notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recruit_progress (
      id TEXT PRIMARY KEY,
      officer_id TEXT NOT NULL REFERENCES officers(id),
      stage_id TEXT NOT NULL,
      stage_name TEXT,
      status TEXT NOT NULL DEFAULT 'not_started',
      notes TEXT,
      updated_by_id TEXT,
      updated_by_name TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(officer_id, stage_id)
    );

    CREATE TABLE IF NOT EXISTS fto_shifts (
      id TEXT PRIMARY KEY,
      fto_officer_id TEXT,
      fto_name TEXT NOT NULL,
      recruit_officer_id TEXT,
      recruit_name TEXT NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 8,
      type TEXT DEFAULT 'Field Patrol',
      notes TEXT,
      logged_by_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      officer_id TEXT,
      officer_name TEXT NOT NULL,
      callsign TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      issued_by_id TEXT,
      issued_by TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      officer_id TEXT,
      officer_name TEXT,
      category TEXT NOT NULL DEFAULT 'General',
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      message TEXT NOT NULL,
      department TEXT,
      status TEXT NOT NULL DEFAULT 'unread',
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recruit_stages (
      id TEXT PRIMARY KEY,
      recruit_officer_id TEXT NOT NULL,
      recruit_name TEXT NOT NULL,
      callsign TEXT,
      fto_name TEXT,
      stage_index INTEGER NOT NULL DEFAULT 0,
      stage_statuses TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(recruit_officer_id)
    );
  `);

  // Seed only the admin account — no preset officers
  const existing = db.prepare('SELECT id FROM officers WHERE username = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO officers (id,badge_number,username,password,first_name,last_name,rank,department,role,status,callsign) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      uuidv4(), 'ADM001', 'admin', hash, 'System', 'Admin', 'Commissioner', 'GD', 'admin', 'on_duty', 'ADM-001'
    );

    // Seed welcome announcement
    db.prepare(`INSERT INTO announcements (id,title,content,category,author_name,pinned) VALUES (?,?,?,?,?,?)`).run(
      uuidv4(),
      'Welcome to NextAirs',
      'Welcome to the NextAirs MDT system. This is your department\'s central hub for dispatch, records, personnel management and more.\n\nTo get started:\n• Register officer accounts via the Register page\n• Set roles via Administration → User Management\n• Add recruits via the /apply page\n\nReach out to your system administrator if you need help.',
      'general', 'System Admin', 1
    );

    console.log('[DB] Admin account created. Username: admin | Password: admin123');
    console.log('[DB] No preset officers — register your real officers via /register');
  }
}

module.exports = { db, initDb };
