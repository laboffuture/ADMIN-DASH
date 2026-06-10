const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'admlink_session';
const SESSION_HOURS = 12;

// Constant-time comparison via hashing (inputs may differ in length).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createAuth({ password, secret }) {
  if (!password || !secret) {
    throw new Error('ADMIN_PASSWORD and SESSION_SECRET must both be set');
  }

  function loginHandler(req, res) {
    const supplied = req.body && req.body.password;
    if (!supplied || !safeEqual(supplied, password)) {
      return res.status(401).json({ error: 'invalid password' });
    }
    const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: `${SESSION_HOURS}h` });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_HOURS * 60 * 60 * 1000,
    });
    res.json({ ok: true });
  }

  function logoutHandler(req, res) {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  }

  function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'not authenticated' });
    try {
      jwt.verify(token, secret);
      next();
    } catch {
      res.status(401).json({ error: 'session expired' });
    }
  }

  return { loginHandler, logoutHandler, requireAuth, COOKIE_NAME };
}

module.exports = { createAuth };
