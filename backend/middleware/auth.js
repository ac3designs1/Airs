require('dotenv').config();
const jwt = require('jsonwebtoken');
const { db } = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET;

// Crash loudly at startup if no secret is set — never allow the default
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('\n[SECURITY] FATAL: JWT_SECRET is missing or too short.');
  console.error('[SECURITY] Set a strong JWT_SECRET in backend/.env (at least 32 chars).');
  console.error('[SECURITY] Generate one: node -e "require(\'crypto\').randomBytes(64).toString(\'hex\')|console.log"\n');
  process.exit(1);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired — please log in again' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Real-time termination check — ensures terminated officers are blocked immediately
    // even if they hold a valid unexpired token
    const officer = db.prepare('SELECT role, status FROM officers WHERE id=?').get(user.id);
    if (!officer || officer.role === 'terminated' || officer.status === 'terminated') {
      return res.status(403).json({ error: 'Account suspended — contact an administrator' });
    }

    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole, JWT_SECRET };
