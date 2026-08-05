const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createRegistry } = require('./registry');
const { createPoller } = require('./poller');
const { createAuth } = require('./auth');
const { createRates } = require('./rates');
const { createAgent } = require('./agent');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 5500;

const registry = createRegistry(path.join(__dirname, '..', 'projects.json'));
const poller = createPoller(() => registry.load());
const rates = createRates();
const auth = createAuth({
  password: process.env.ADMIN_PASSWORD,
  secret: process.env.SESSION_SECRET,
});

const distPath = path.join(__dirname, '..', 'client', 'dist');
const clientDist = fs.existsSync(distPath) ? distPath : null;

const agent = createAgent({
  getProjects: () => registry.load(),
  getStatuses: () => poller.getStatuses(),
  getRates: () => rates.getRates(),
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const app = createApp({
  registry,
  poller,
  auth,
  clientDist,
  ssoSecret: process.env.HUB_SSO_SECRET,
  rates,
  agent,
});

poller.start();
rates.start();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ADMIN-DASH hub listening on 0.0.0.0:${PORT} (client ${clientDist ? 'served' : 'NOT built yet'})`);
});
