import { describe, it, expect, vi } from 'vitest';
import { createAuth } from '../auth.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    cleared: [],
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    cookie(name, value, opts) { this.cookies[name] = { value, opts }; return this; },
    clearCookie(name) { this.cleared.push(name); return this; },
  };
}

const auth = createAuth({ password: 'hunter2', secret: 'test-secret' });

describe('createAuth', () => {
  it('throws when password or secret is missing', () => {
    expect(() => createAuth({ password: '', secret: 'x' })).toThrow();
    expect(() => createAuth({ password: 'x', secret: '' })).toThrow();
  });

  it('rejects a wrong password with 401 and no cookie', () => {
    const res = mockRes();
    auth.loginHandler({ body: { password: 'wrong' } }, res);
    expect(res.statusCode).toBe(401);
    expect(Object.keys(res.cookies)).toHaveLength(0);
  });

  it('accepts the right password and sets an httpOnly session cookie', () => {
    const res = mockRes();
    auth.loginHandler({ body: { password: 'hunter2' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const cookie = res.cookies[auth.COOKIE_NAME];
    expect(cookie).toBeDefined();
    expect(cookie.opts.httpOnly).toBe(true);
  });

  it('requireAuth passes a valid cookie through and rejects missing/garbage tokens', () => {
    const good = mockRes();
    auth.loginHandler({ body: { password: 'hunter2' } }, good);
    const token = good.cookies[auth.COOKIE_NAME].value;

    const next = vi.fn();
    auth.requireAuth({ cookies: { [auth.COOKIE_NAME]: token } }, mockRes(), next);
    expect(next).toHaveBeenCalled();

    const res401 = mockRes();
    auth.requireAuth({ cookies: {} }, res401, vi.fn());
    expect(res401.statusCode).toBe(401);

    const resBad = mockRes();
    auth.requireAuth({ cookies: { [auth.COOKIE_NAME]: 'garbage' } }, resBad, vi.fn());
    expect(resBad.statusCode).toBe(401);
  });

  it('logout clears the cookie', () => {
    const res = mockRes();
    auth.logoutHandler({}, res);
    expect(res.cleared).toContain(auth.COOKIE_NAME);
    expect(res.body).toEqual({ ok: true });
  });
});
