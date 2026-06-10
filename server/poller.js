// Pings each project's healthUrl (fallback: adminUrl) and caches results.
// online: HTTP < 500 (the server answered) · error: HTTP >= 500 · down: no answer/timeout.
function createPoller(getProjects, { intervalMs = 30000, timeoutMs = 5000, fetchFn = fetch } = {}) {
  const statuses = {};
  let timer = null;

  async function checkProject(project) {
    const url = project.healthUrl || project.adminUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    let result;
    try {
      const res = await fetchFn(url, { signal: controller.signal, redirect: 'follow' });
      result = {
        status: res.status >= 500 ? 'error' : 'online',
        httpStatus: res.status,
        latencyMs: Date.now() - started,
      };
    } catch {
      result = { status: 'down', httpStatus: null, latencyMs: null };
    } finally {
      clearTimeout(timeout);
    }
    statuses[project.id] = { ...result, lastChecked: new Date().toISOString() };
  }

  async function checkAll() {
    await Promise.all(getProjects().map(checkProject));
    return getStatuses();
  }

  function getStatuses() {
    return { ...statuses };
  }

  function start() {
    if (timer) return;
    checkAll();
    timer = setInterval(checkAll, intervalMs);
    if (timer.unref) timer.unref();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { checkAll, getStatuses, start, stop };
}

module.exports = { createPoller };
