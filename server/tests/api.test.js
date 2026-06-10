import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createAuth } from '../auth.js';

const PROJECTS = [
  { id: 'a', name: 'Project A', adminUrl: 'http://10.0.0.5:4000/admin' },
];
const STATUSES = {
  a: { status: 'online', httpStatus: 200, latencyMs: 12, lastChecked: '2026-06-10T00:00:00.000Z' },
};

let app;

beforeEach(() => {
  app = createApp({
    registry: { load: () => PROJECTS },
    poller: { getStatuses: () => STATUSES },
    auth: createAuth({ password: 'hunter2', secret: 'test-secret' }),
    clientDist: null,
  });
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
