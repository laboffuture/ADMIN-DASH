import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { createAuth } from '../auth.js';

const PROJECTS = [
  { id: 'a', name: 'Project A', adminUrl: 'http://10.0.0.5:4000/admin', sso: true },
  { id: 'b', name: 'Project B', adminUrl: 'http://10.0.0.5:5000/admin' },
];
const STATUSES = {
  a: { status: 'online', httpStatus: 200, latencyMs: 12, lastChecked: '2026-06-10T00:00:00.000Z' },
};

let app;

function buildApp(overrides = {}) {
  return createApp({
    registry: { load: () => PROJECTS },
    poller: { getStatuses: () => STATUSES },
    auth: createAuth({ password: 'hunter2', secret: 'test-secret' }),
    clientDist: null,
    ssoSecret: 'sso-secret',
    ...overrides,
  });
}

beforeEach(() => {
  app = buildApp();
});

async function loginCookie() {
  const res = await request(app).post('/api/login').send({ password: 'hunter2' });
  return res.headers['set-cookie'];
}

describe('API', () => {
  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/login').send({ password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('logs in and grants /api/me', async () => {
    const cookie = await loginCookie();
    expect(cookie).toBeDefined();
    const me = await request(app).get('/api/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ ok: true });
  });

  it('blocks /api/projects and /api/status without a session', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
    expect((await request(app).get('/api/status')).status).toBe(401);
  });

  it('serves the registry to a logged-in admin', async () => {
    const cookie = await loginCookie();
    const res = await request(app).get('/api/projects').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(PROJECTS);
  });

  it('serves cached statuses to a logged-in admin', async () => {
    const cookie = await loginCookie();
    const res = await request(app).get('/api/status').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(STATUSES);
  });
});

describe('agent chat endpoint', () => {
  const stubAgent = { chat: async (m) => ({ reply: `you said: ${m}`, source: 'local' }) };

  it('requires a session', async () => {
    const withAgent = buildApp({ agent: stubAgent });
    expect((await request(withAgent).post('/api/agent/chat').send({ message: 'hi' })).status).toBe(401);
  });

  it('answers a logged-in admin', async () => {
    const withAgent = buildApp({ agent: stubAgent });
    const login = await request(withAgent).post('/api/login').send({ password: 'hunter2' });
    const res = await request(withAgent).post('/api/agent/chat')
      .set('Cookie', login.headers['set-cookie']).send({ message: 'status?' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reply: 'you said: status?', source: 'local' });
  });

  it('rejects empty messages', async () => {
    const withAgent = buildApp({ agent: stubAgent });
    const login = await request(withAgent).post('/api/login').send({ password: 'hunter2' });
    const res = await request(withAgent).post('/api/agent/chat')
      .set('Cookie', login.headers['set-cookie']).send({ message: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('rates endpoint', () => {
  const RATES = { usdInr: 85.6, aedInr: 23.31, fetchedAt: '2026-06-11T00:00:00.000Z' };

  it('requires a session', async () => {
    const withRates = buildApp({ rates: { getRates: () => RATES } });
    expect((await request(withRates).get('/api/rates')).status).toBe(401);
  });

  it('serves cached FX rates to a logged-in admin', async () => {
    const withRates = buildApp({ rates: { getRates: () => RATES } });
    const login = await request(withRates).post('/api/login').send({ password: 'hunter2' });
    const res = await request(withRates).get('/api/rates').set('Cookie', login.headers['set-cookie']);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rates: RATES });
  });

  it('serves null rates when none have been fetched yet', async () => {
    const empty = buildApp({ rates: { getRates: () => null } });
    const login = await request(empty).post('/api/login').send({ password: 'hunter2' });
    const res = await request(empty).get('/api/rates').set('Cookie', login.headers['set-cookie']);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rates: null });
  });
});

describe('SSO token endpoint', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/sso-token/a')).status).toBe(401);
  });

  it('mints a short-lived token scoped to the module', async () => {
    const cookie = await loginCookie();
    const res = await request(app).get('/api/sso-token/a').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, 'sso-secret', { audience: 'a' });
    expect(decoded.sub).toBe('hub-admin');
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(60);
  });

  it('rejects unknown modules and modules without sso enabled', async () => {
    const cookie = await loginCookie();
    expect((await request(app).get('/api/sso-token/nope').set('Cookie', cookie)).status).toBe(404);
    expect((await request(app).get('/api/sso-token/b').set('Cookie', cookie)).status).toBe(400);
  });

  it('returns 503 when no SSO secret is configured', async () => {
    const bare = buildApp({ ssoSecret: undefined });
    const login = await request(bare).post('/api/login').send({ password: 'hunter2' });
    const res = await request(bare).get('/api/sso-token/a').set('Cookie', login.headers['set-cookie']);
    expect(res.status).toBe(503);
  });
});
