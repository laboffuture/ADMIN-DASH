async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  login: (password) => request('/api/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  me: () => request('/api/me'),
  projects: () => request('/api/projects'),
  status: () => request('/api/status'),
  rates: () => request('/api/rates'),
  agentChat: (message) => request('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  ssoToken: (projectId) => request(`/api/sso-token/${projectId}`),
};
