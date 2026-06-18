require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth');

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const FRONTEND_URL  = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const BACKEND_URL   = (process.env.BACKEND_URL  || 'http://localhost:3001').replace(/\/$/, '');
const JWT_SECRET    = process.env.JWT_SECRET;

function discordAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

async function exchangeCode(code, redirectUri) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

async function getDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Discord user');
  return res.json();
}

function issueJwt(officer) {
  return jwt.sign(
    {
      id: officer.id,
      username: officer.username,
      role: officer.role,
      callsign: officer.callsign,
      first_name: officer.first_name,
      last_name: officer.last_name,
      department: officer.department,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

/* ── MDT LOGIN ─────────────────────────────────────────────── */

// GET /api/auth/discord/login  →  redirect to Discord
router.get('/login', (req, res) => {
  if (!CLIENT_ID) return res.status(503).json({ error: 'Discord OAuth not configured' });
  const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;
  res.redirect(discordAuthUrl(redirectUri, 'login'));
});

// GET /api/auth/discord/callback  →  handle MDT login
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?discord_error=cancelled`);
  }
  try {
    const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const discordUser = await getDiscordUser(tokens.access_token);

    const discordId       = discordUser.id;
    const discordUsername = discordUser.username;
    const avatarUrl       = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : null;

    // Find officer by discord_id first, then by discord_username fallback
    let officer = db.prepare('SELECT * FROM officers WHERE discord_id = ?').get(discordId);
    if (!officer) {
      officer = db.prepare('SELECT * FROM officers WHERE discord_username = ?').get(discordUsername);
    }

    if (!officer) {
      // No account found — send them to login with their discord tag so they can show admin
      const tag = encodeURIComponent(discordUsername);
      return res.redirect(`${FRONTEND_URL}/login?discord_error=no_account&discord_tag=${tag}`);
    }

    if (officer.role === 'terminated' || officer.status === 'terminated') {
      return res.redirect(`${FRONTEND_URL}/login?discord_error=terminated`);
    }

    // Auto-link discord_id and update avatar/username
    db.prepare('UPDATE officers SET discord_id=?, discord_username=?, avatar_url=COALESCE(?,avatar_url), last_login=datetime("now") WHERE id=?')
      .run(discordId, discordUsername, avatarUrl, officer.id);

    const token = issueJwt({ ...officer, discord_id: discordId });
    // Redirect to frontend with token — frontend reads it from URL and stores in localStorage
    res.redirect(`${FRONTEND_URL}/auth/discord?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[Discord OAuth]', err.message);
    res.redirect(`${FRONTEND_URL}/login?discord_error=server_error`);
  }
});

/* ── APPLY PAGE ────────────────────────────────────────────── */

// GET /api/auth/discord/apply  →  redirect to Discord (apply flow)
router.get('/apply', (req, res) => {
  if (!CLIENT_ID) return res.status(503).json({ error: 'Discord OAuth not configured' });
  const redirectUri = `${BACKEND_URL}/api/auth/discord/apply-callback`;
  res.redirect(discordAuthUrl(redirectUri, 'apply'));
});

// GET /api/auth/discord/apply-callback  →  redirect to /apply with Discord info
router.get('/apply-callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/apply?discord_error=cancelled`);
  }
  try {
    const redirectUri = `${BACKEND_URL}/api/auth/discord/apply-callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const discordUser = await getDiscordUser(tokens.access_token);

    const params = new URLSearchParams({
      discord_id:       discordUser.id,
      discord_username: discordUser.username,
      discord_avatar:   discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : '',
    });
    res.redirect(`${FRONTEND_URL}/apply?${params}`);
  } catch (err) {
    console.error('[Discord OAuth Apply]', err.message);
    res.redirect(`${FRONTEND_URL}/apply?discord_error=server_error`);
  }
});

/* ── LINK DISCORD (settings) ───────────────────────────────── */

// GET /api/auth/discord/link  →  officer links their Discord account
router.get('/link', authenticateToken, (req, res) => {
  if (!CLIENT_ID) return res.status(503).json({ error: 'Discord OAuth not configured' });
  const redirectUri = `${BACKEND_URL}/api/auth/discord/link-callback`;
  // Encode officer ID in state so we know who to link on callback
  const state = Buffer.from(JSON.stringify({ type: 'link', officerId: req.user.id })).toString('base64url');
  res.redirect(discordAuthUrl(redirectUri, state));
});

// GET /api/auth/discord/link-callback
router.get('/link-callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) return res.redirect(`${FRONTEND_URL}/settings?discord_error=cancelled`);
  try {
    const { officerId } = JSON.parse(Buffer.from(state, 'base64url').toString());
    const redirectUri = `${BACKEND_URL}/api/auth/discord/link-callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const discordUser = await getDiscordUser(tokens.access_token);

    // Check discord_id not already on another account
    const existing = db.prepare('SELECT id FROM officers WHERE discord_id = ? AND id != ?').get(discordUser.id, officerId);
    if (existing) return res.redirect(`${FRONTEND_URL}/settings?discord_error=already_linked`);

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    db.prepare('UPDATE officers SET discord_id=?, discord_username=?, avatar_url=COALESCE(?,avatar_url) WHERE id=?')
      .run(discordUser.id, discordUser.username, avatarUrl, officerId);

    res.redirect(`${FRONTEND_URL}/settings?discord_linked=1`);
  } catch (err) {
    console.error('[Discord Link]', err.message);
    res.redirect(`${FRONTEND_URL}/settings?discord_error=server_error`);
  }
});

module.exports = router;
