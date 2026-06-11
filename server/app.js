const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const SSO_TOKEN_TTL_SECONDS = 60;

// clientDist: absolute path to the built client, or null to skip static serving (dev/tests).
// ssoSecret: shared secret for minting module SSO tokens (HUB_SSO_SECRET); optional.
// rates: cached FX rates service for the topbar; optional.
function createApp({ registry, poller, auth, clientDist, ssoSecret, rates }) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.post('/api/login', auth.loginHandler);
  app.post('/api/logout', auth.logoutHandler);
  app.get('/api/me', auth.requireAuth, (req, res) => res.json({ ok: true }));
  app.get('/api/projects', auth.requireAuth, (req, res) => res.json(registry.load()));
  app.get('/api/status', auth.requireAuth, (req, res) => res.json(poller.getStatuses()));
  app.get('/api/rates', auth.requireAuth, (req, res) =>
    res.json({ rates: rates ? rates.getRates() : null }));

  // Short-lived token a module exchanges for its own session (no passwords involved).
  app.get('/api/sso-token/:projectId', auth.requireAuth, (req, res) => {
    const project = registry.load().find((p) => p.id === req.params.projectId);
    if (!project) return res.status(404).json({ error: 'unknown project' });
    if (!project.sso) return res.status(400).json({ error: 'sso not enabled for this project' });
    if (!ssoSecret) return res.status(503).json({ error: 'HUB_SSO_SECRET not configured on the hub' });
    const token = jwt.sign({ sub: 'hub-admin' }, ssoSecret, {
      audience: project.id,
      expiresIn: SSO_TOKEN_TTL_SECONDS,
    });
    res.json({ token });
  });

  if (clientDist) {
    app.use(express.static(clientDist));
    // SPA fallback for everything that is not an API route
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}

module.exports = { createApp };
