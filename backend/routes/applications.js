const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const https = require('https');
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

// ── Migrate table ─────────────────────────────────────────────
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

// ── Discord DM helper (uses built-in https — no fetch required) ─
function sendDiscordDM(discordId, message) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !discordId) return Promise.resolve();

  return new Promise(resolve => {
    const body = JSON.stringify({ recipient_id: discordId });
    const req = https.request({
      hostname: 'discord.com',
      path: '/api/v10/users/@me/channels',
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const dm = JSON.parse(data);
          if (!dm.id) return resolve();
          const msg = JSON.stringify({ content: message });
          const req2 = https.request({
            hostname: 'discord.com',
            path: `/api/v10/channels/${dm.id}/messages`,
            method: 'POST',
            headers: {
              Authorization: `Bot ${token}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(msg),
            },
          }, () => resolve());
          req2.on('error', () => resolve());
          req2.write(msg);
          req2.end();
        } catch { resolve(); }
      });
    });
    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

// ── POST /api/applications — public ───────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      full_name, discord, discord_id, discord_username, discord_avatar,
      age, timezone, experience, why_join, availability, referral,
    } = req.body;

    if (!full_name || !discord || !age || !timezone || !why_join) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    if (discord_id) {
      const dupe = db.prepare(
        "SELECT id FROM applications WHERE discord_id = ? AND status NOT IN ('denied')"
      ).get(discord_id);
      if (dupe) {
        return res.status(409).json({
          error: 'You already have an active application. Sign in with Discord on the apply page to check its status.',
        });
      }
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO applications
        (id,full_name,discord,discord_id,discord_username,discord_avatar,age,timezone,experience,why_join,availability,referral)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id, full_name, discord, discord_id || null, discord_username || null, discord_avatar || null,
      age, timezone, experience || '', why_join, availability || '', referral || '');

    res.status(201).json({ message: 'Application submitted', id });

    // Send confirmation DM (after response so it doesn't delay the user)
    if (discord_id) {
      sendDiscordDM(discord_id,
        `👋 **Hey ${full_name}!**\n\nThank you for applying to join **Next RP Melbourne Police**! ✅\n\nYour application has been received and is under review. Here's what to expect:\n\n⏱️ **Review time:** 24–72 hours\n📋 **If shortlisted:** You'll be contacted for an interview via Discord\n🎓 **If approved:** You'll complete initial training before getting full MDT access\n\nCheck your status at any time by visiting our apply page and signing in with Discord.\n\n*— Next RP Leadership Team*`
      );
    }
  } catch (err) {
    console.error('[POST /applications]', err.message);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// ── GET /api/applications — leadership ────────────────────────
router.get('/', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.query;
  let q = 'SELECT * FROM applications';
  const params = [];
  if (status) { q += ' WHERE status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

// ── GET /api/applications/stats ───────────────────────────────
// Must be registered BEFORE /:id to avoid being swallowed
router.get('/stats', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.json({ pending: 0 });
  const row = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status='pending'").get();
  res.json({ pending: row.c });
});

// ── GET /api/applications/track — public ──────────────────────
// Must be registered BEFORE /:id to avoid being swallowed
router.get('/track', (req, res) => {
  const { id, discord_id } = req.query;
  if (!id && !discord_id) return res.status(400).json({ error: 'Provide id or discord_id' });
  let app;
  if (id) {
    app = db.prepare(
      'SELECT id,full_name,discord_username,discord_avatar,status,created_at,reviewed_at,review_notes FROM applications WHERE id=?'
    ).get(id);
  } else {
    app = db.prepare(
      'SELECT id,full_name,discord_username,discord_avatar,status,created_at,reviewed_at,review_notes FROM applications WHERE discord_id=? ORDER BY created_at DESC LIMIT 1'
    ).get(discord_id);
  }
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status === 'denied') app.review_notes = null;
  res.json(app);
});

// ── PUT /api/applications/:id — approve / deny ────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const { status, review_notes, interview_message } = req.body;
    if (!['approved', 'denied', 'pending', 'interview'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });

    const reviewer = `${req.user.first_name ?? ''} ${req.user.last_name ?? ''}`.trim() || req.user.username;
    db.prepare(`UPDATE applications SET status=?, reviewed_by=?, review_notes=?, reviewed_at=datetime('now') WHERE id=?`)
      .run(status, reviewer, review_notes || '', req.params.id);

    // ── Interview: DM with time slots ──────────────────────────
    if (status === 'interview' && app.discord_id) {
      const timesSection = interview_message
        ? `\n\n📅 **Suggested Interview Times:**\n${interview_message}\n\nPlease reply confirming which time works best, or contact leadership on our Discord.`
        : '\n\nLeadership will reach out shortly to arrange a suitable time.';
      sendDiscordDM(app.discord_id,
        `👋 **Hey ${app.full_name}!**\n\nGreat news — your application to **Next RP Melbourne Police** has been shortlisted for an interview! 🎉${timesSection}\n\n*— Next RP Leadership*`
      );
    }

    // ── Approved: create recruit officer + DM ──────────────────
    if (status === 'approved') {
      // Skip if ANY officer already has this discord_id (UNIQUE constraint)
      const existing = app.discord_id
        ? db.prepare('SELECT id FROM officers WHERE discord_id = ?').get(app.discord_id)
        : null;

      if (!existing) {
        const nameParts = (app.full_name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'New';
        const lastName  = nameParts.slice(1).join(' ') || 'Officer';
        const ts        = Date.now().toString().slice(-6);
        const randomPwd = bcrypt.hashSync(uuidv4(), 10);

        // Unique username
        const baseUser = (app.discord_username || app.discord || `officer_${ts}`)
          .toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 28);
        let finalUsername = baseUser;
        let n = 1;
        while (db.prepare('SELECT id FROM officers WHERE username = ?').get(finalUsername)) {
          finalUsername = `${baseUser}_${n++}`;
        }

        // Unique badge
        let badge = `RCT${ts}`;
        let bn = 1;
        while (db.prepare('SELECT id FROM officers WHERE badge_number = ?').get(badge)) {
          badge = `RCT${ts}${bn++}`;
        }

        db.prepare(`
          INSERT INTO officers
            (id,badge_number,username,password,first_name,last_name,rank,department,role,status,callsign,discord_id,discord_username,avatar_url)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          uuidv4(), badge, finalUsername, randomPwd,
          firstName, lastName, 'Recruit', 'Academy', 'recruit', 'off_duty',
          `RCT-${ts}`,
          app.discord_id || null, app.discord_username || null, app.discord_avatar || null,
        );
      }

      if (app.discord_id) {
        sendDiscordDM(app.discord_id,
          `🎉 **Congratulations ${app.full_name}!**\n\nYour application to join **Next RP Melbourne Police** has been **approved**! Welcome to the team! 🚔\n\n**What happens now:**\n1️⃣ Sign in to the NextAirs MDT using Discord\n2️⃣ You'll be placed in the Initial Training queue\n3️⃣ Leadership will contact you to schedule your training sessions\n4️⃣ Once training is complete you'll receive full MDT access and your official callsign\n\n**Starting rank:** Recruit · Academy Division\n\nWe're excited to have you. See you out there! 🫡\n\n*— Next RP Leadership Team*`
        );
      }
    }

    // ── Denied: DM ────────────────────────────────────────────
    if (status === 'denied' && app.discord_id) {
      sendDiscordDM(app.discord_id,
        `👋 **Hey ${app.full_name},**\n\nThank you for applying to **Next RP Melbourne Police**.\n\nAfter careful consideration, we're unable to approve your application at this time. This decision may be based on a number of factors and doesn't reflect your potential as a roleplayer.\n\nYou're welcome to reapply in the future — keep building your RP experience and we hope to see you again!\n\n*— Next RP Leadership Team*`
      );
    }

    res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));

  } catch (err) {
    console.error('[PUT /applications/:id]', err.message);
    res.status(500).json({ error: 'Failed to update application: ' + err.message });
  }
});

// ── DELETE /api/applications/:id ──────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  if (!LEADERSHIP.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
