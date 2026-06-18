const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// Migrate table — add discord columns if missing
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    discord TEXT NOT NULL,
    discord_id TEXT,
    discord_username TEXT,
    discord_avatar TEXT,
    age INTEGER NOT NULL,
    timezone TEXT NOT NULL,
    experience TEXT,
    why_join TEXT NOT NULL,
    availability TEXT,
    referral TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    review_notes TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);
try { db.exec('ALTER TABLE applications ADD COLUMN discord_id TEXT'); } catch {}
try { db.exec('ALTER TABLE applications ADD COLUMN discord_username TEXT'); } catch {}
try { db.exec('ALTER TABLE applications ADD COLUMN discord_avatar TEXT'); } catch {}

// ── POST /api/applications — public, no auth ──────────────────
router.post('/', (req, res) => {
  const {
    full_name, discord, discord_id, discord_username, discord_avatar,
    age, timezone, experience, why_join, availability, referral,
  } = req.body;
  if (!full_name || !discord || !age || !timezone || !why_join) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  // Block duplicate Discord applications
  if (discord_id) {
    const dupe = db.prepare("SELECT id FROM applications WHERE discord_id = ? AND status NOT IN ('denied')").get(discord_id);
    if (dupe) return res.status(409).json({ error: 'You already have an active application. Use the tracker to check its status.' });
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO applications
      (id,full_name,discord,discord_id,discord_username,discord_avatar,age,timezone,experience,why_join,availability,referral)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, full_name, discord, discord_id || null, discord_username || null, discord_avatar || null,
    age, timezone, experience || '', why_join, availability || '', referral || '');
  res.status(201).json({ message: 'Application submitted', id });
});

// ── GET /api/applications — leadership only ───────────────────
router.get('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.query;
  let q = 'SELECT * FROM applications';
  const params = [];
  if (status) { q += ' WHERE status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

// ── Sends a Discord DM via bot token ──────────────────────────
async function sendDiscordDM(discordId, message) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !discordId) return;
  try {
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: discordId }),
    });
    const dm = await dmRes.json();
    if (!dm.id) return;
    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.error('[Discord DM Error]', e.message);
  }
}

// ── PUT /api/applications/:id — approve / deny ────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status, review_notes, interview_message } = req.body;
  if (!['approved', 'denied', 'pending', 'interview'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const reviewer = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
  db.prepare(`UPDATE applications SET status=?, reviewed_by=?, review_notes=?, reviewed_at=datetime('now') WHERE id=?`)
    .run(status, reviewer, review_notes || '', req.params.id);

  // Send Discord DM on interview
  if (status === 'interview' && app.discord_id) {
    const timesSection = interview_message
      ? `\n\n📅 **Suggested Interview Times:**\n${interview_message}\n\nPlease reply confirming which time works best, or contact leadership on our Discord.`
      : '\n\nLeadership will reach out shortly to arrange a suitable time.';
    await sendDiscordDM(
      app.discord_id,
      `👋 **Hey ${app.full_name}!**\n\nGreat news — your application to join **Next RP Melbourne Police** has been reviewed and you've been shortlisted for an interview! 🎉${timesSection}\n\n*— Next RP Leadership*`,
    );
  }

  // Auto-create officer account on approval
  if (status === 'approved') {
    const existing = app.discord_id
      ? db.prepare('SELECT id FROM officers WHERE discord_id = ?').get(app.discord_id)
      : db.prepare('SELECT id FROM officers WHERE username = ?').get(app.discord_username || app.discord);

    if (!existing) {
      // Split full_name into first/last
      const nameParts = (app.full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'New';
      const lastName  = nameParts.slice(1).join(' ') || 'Officer';

      // Generate unique badge number
      const ts = Date.now().toString().slice(-6);
      const badgeNum = `RCT${ts}`;

      // Random unusable password (Discord-only login)
      const randomPwd = bcrypt.hashSync(uuidv4(), 10);

      const username = (app.discord_username || app.discord || `officer_${ts}`)
        .toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);

      // Ensure username uniqueness
      let finalUsername = username;
      let suffix = 1;
      while (db.prepare('SELECT id FROM officers WHERE username = ?').get(finalUsername)) {
        finalUsername = `${username}_${suffix++}`;
      }

      db.prepare(`
        INSERT INTO officers
          (id,badge_number,username,password,first_name,last_name,rank,department,role,status,callsign,discord_id,discord_username,avatar_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        uuidv4(), badgeNum, finalUsername, randomPwd,
        firstName, lastName,
        'Recruit', 'Academy', 'recruit', 'off_duty',
        `RCT-${ts}`,
        app.discord_id || null,
        app.discord_username || null,
        app.discord_avatar || null,
      );
    }
  }

  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
});

// ── DELETE /api/applications/:id ──────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ── GET /api/applications/track — public status tracker ───────
router.get('/track', (req, res) => {
  const { id, discord_id } = req.query;
  if (!id && !discord_id) return res.status(400).json({ error: 'Provide id or discord_id' });
  let app;
  if (id) {
    app = db.prepare('SELECT id,full_name,discord_username,discord_avatar,status,created_at,reviewed_at,review_notes FROM applications WHERE id=?').get(id);
  } else {
    app = db.prepare('SELECT id,full_name,discord_username,discord_avatar,status,created_at,reviewed_at,review_notes FROM applications WHERE discord_id=? ORDER BY created_at DESC LIMIT 1').get(discord_id);
  }
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status === 'denied') app.review_notes = null;
  res.json(app);
});

// ── GET /api/applications/stats ───────────────────────────────
router.get('/stats', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.json({ pending: 0 });
  const row = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status='pending'").get();
  res.json({ pending: row.c });
});

module.exports = router;
