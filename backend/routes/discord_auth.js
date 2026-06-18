require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const https = require('https');
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

// Use Node's native https module for reliability on Railway / all Node versions
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    https.get({ hostname, path, headers }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function exchangeCode(code, redirectUri) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  }).toString();

  const res = await httpsPost('discord.com', '/api/oauth2/token', {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
  }, body);

  if (!res.ok) {
    const payload = res.json();
    throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(payload)}`);
  }
  return res.json();
}

async function getDiscordUser(accessToken) {
  const res = await httpsGet('discord.com', '/api/users/@me', {
    Authorization: `Bearer ${accessToken}`,
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user (${res.status})`);
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

/* ── DIAGNOSTIC (public) ───────────────────────────────────── */

// GET /api/auth/discord/check  →  verify env var config without exposing secrets
router.get('/check', (_req, res) => {
  res.json({
    client_id_set:     !!CLIENT_ID,
    client_secret_set: !!CLIENT_SECRET,
    jwt_secret_set:    !!JWT_SECRET,
    frontend_url:      FRONTEND_URL,
    backend_url:       BACKEND_URL,
    callback_url:      `${BACKEND_URL}/api/auth/discord/callback`,
  });
});

/* ── MDT LOGIN ─────────────────────────────────────────────── */

// GET /api/auth/discord/login  →  redirect to Discord
router.get('/login', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[Discord OAuth] DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set in environment');
    return res.redirect(`${FRONTEND_URL}/login?discord_error=not_configured`);
  }
  if (!JWT_SECRET) {
    console.error('[Discord OAuth] JWT_SECRET not set in environment');
    return res.redirect(`${FRONTEND_URL}/login?discord_error=not_configured`);
  }
  const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;
  console.log('[Discord OAuth login] redirectUri:', redirectUri);
  res.redirect(discordAuthUrl(redirectUri, 'login'));
});

// GET /api/auth/discord/callback  →  handle MDT login
router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error || !code) {
    console.error('[Discord OAuth callback] Discord returned error:', error, error_description);
    return res.redirect(`${FRONTEND_URL}/login?discord_error=cancelled`);
  }
  try {
    const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;
    console.log('[Discord OAuth callback] Exchanging code with redirectUri:', redirectUri);

    let tokens;
    try {
      tokens = await exchangeCode(code, redirectUri);
    } catch (e) {
      console.error('[Discord OAuth callback] Token exchange failed:', e.message);
      return res.redirect(`${FRONTEND_URL}/login?discord_error=token_failed`);
    }

    let discordUser;
    try {
      discordUser = await getDiscordUser(tokens.access_token);
    } catch (e) {
      console.error('[Discord OAuth callback] Failed to fetch Discord user:', e.message);
      return res.redirect(`${FRONTEND_URL}/login?discord_error=token_failed`);
    }

    const discordId       = discordUser.id;
    const discordUsername = discordUser.username;
    const avatarUrl       = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : null;

    console.log('[Discord OAuth callback] User:', discordUsername, '(', discordId, ')');

    // Find officer by discord_id first, then by discord_username fallback
    let officer = db.prepare('SELECT * FROM officers WHERE discord_id = ?').get(discordId);
    if (!officer) {
      officer = db.prepare('SELECT * FROM officers WHERE discord_username = ?').get(discordUsername);
    }

    if (!officer) {
      const tag = encodeURIComponent(discordUsername);
      console.log('[Discord OAuth callback] No officer found for Discord user:', discordUsername);
      return res.redirect(`${FRONTEND_URL}/login?discord_error=no_account&discord_tag=${tag}`);
    }

    if (officer.role === 'terminated' || officer.status === 'terminated') {
      return res.redirect(`${FRONTEND_URL}/login?discord_error=terminated`);
    }

    // Auto-link discord_id and update avatar/username
    db.prepare('UPDATE officers SET discord_id=?, discord_username=?, avatar_url=COALESCE(?,avatar_url), last_login=datetime("now") WHERE id=?')
      .run(discordId, discordUsername, avatarUrl, officer.id);

    const token = issueJwt({ ...officer, discord_id: discordId });
    res.redirect(`${FRONTEND_URL}/auth/discord?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[Discord OAuth login callback] Unexpected error:', err.message, err.stack);
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
