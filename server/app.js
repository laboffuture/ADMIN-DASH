const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const SSO_TOKEN_TTL_SECONDS = 60;

// clientDist: absolute path to the built client, or null to skip static serving (dev/tests).
// ssoSecret: shared secret for minting module SSO tokens (HUB_SSO_SECRET); optional.
// rates: cached FX rates service for the topbar; optional.
// agent: Clawd, the in-portal chat agent; optional.
function createApp({ registry, poller, auth, clientDist, ssoSecret, rates, agent }) {
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

  app.post('/api/agent/chat', auth.requireAuth, async (req, res) => {
    if (!agent) return res.status(503).json({ error: 'agent not configured' });
    const message = String((req.body && req.body.message) || '').trim();
    if (!message) return res.status(400).json({ error: 'empty message' });
    res.json(await agent.chat(message));
  });

  // Proxy endpoint for modules with frame-blocking headers (X-Frame-Options)
  app.get('/api/proxy/:projectId', auth.requireAuth, async (req, res) => {
    const project = registry.load().find((p) => p.id === req.params.projectId);
    if (!project || !project.adminUrl) {
      return res.status(404).send('Project not found or missing adminUrl');
    }
    try {
      const response = await fetch(project.adminUrl, {
        headers: { 'User-Agent': 'AdminLinkHub/1.0' },
      });
      if (!response.ok) {
        return res.status(response.status).send(`Upstream server returned ${response.status}`);
      }
      let html = await response.text();
      const targetUrl = new URL(project.adminUrl);
      const targetPath = targetUrl.pathname + targetUrl.search;
      const headInjection = `<head><base href="${targetUrl.origin}/"><script>(function(){try{if(window.location.pathname!==${JSON.stringify(targetPath)}){window.history.replaceState(null,'',${JSON.stringify(targetPath)});} }catch(e){}})();</script>`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', headInjection);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', headInjection);
      }
      res.removeHeader('x-frame-options');
      res.removeHeader('content-security-policy');
      res.setHeader('content-type', response.headers.get('content-type') || 'text/html');
      res.send(html);
    } catch (err) {
      res.status(502).send('Error proxying project: ' + err.message);
    }
  });

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
