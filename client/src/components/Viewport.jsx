import { useEffect, useState } from 'react';
import { api } from '../api';

function buildFrameSrc(project, hubToken) {
  if (!project || !project.adminUrl) return '';
  if (project.proxy) {
    return `/api/proxy/${project.id}`;
  }
  let src = project.adminUrl + (project.adminUrl.includes('?') ? '&' : '?') + 'embed=1';
  if (hubToken) src += `&hub_token=${encodeURIComponent(hubToken)}`;
  return src;
}

export function Viewport({ project, status, onRetry }) {
  const [frameKey, setFrameKey] = useState(0);
  // null = no token (not needed or failed) · 'loading' = fetching · string = token
  const [hubToken, setHubToken] = useState(null);

  const projectId = project && project.id;
  const needsSso = Boolean(project && project.sso && project.adminUrl);

  useEffect(() => {
    if (!needsSso) {
      setHubToken(null);
      return;
    }
    let alive = true;
    setHubToken('loading');
    api
      .ssoToken(projectId)
      .then((r) => alive && setHubToken(r.token))
      .catch(() => alive && setHubToken(null));
    return () => {
      alive = false;
    };
  }, [needsSso, projectId, frameKey]); // frameKey: reload button mints a fresh token

  if (!project) {
    return (
      <main className="viewport viewport-empty">
        <p>Select a project</p>
      </main>
    );
  }

  const notConnected = !project.adminUrl;
  const down = status && status.status === 'down';
  const ssoLoading = needsSso && hubToken === 'loading';
  // Some modules refuse framing (X-Frame-Options / CSP frame-ancestors). The
  // browser blocks those before we can see it, so the module declares it in
  // projects.json and we offer a launch panel rather than a blank frame.
  const noEmbed = project.embed === false;

  return (
    <main className="viewport">
      <div className="toolbar">
        <span className="toolbar-title">{project.name}</span>
        <span className="toolbar-desc">{project.description}</span>
        {!notConnected && (
          <span className="toolbar-actions">
            <button onClick={() => setFrameKey((k) => k + 1)} title="Reload frame">↻ reload</button>
            <a href={project.adminUrl} target="_blank" rel="noreferrer" title="Open in new tab">↗ new tab</a>
          </span>
        )}
      </div>
      {notConnected ? (
        <div className="down-panel">
          <h2>{project.name} is not connected yet</h2>
          <p>Waiting for this project's admin page address — it will appear here automatically once configured.</p>
        </div>
      ) : down ? (
        <div className="down-panel">
          <h2>{project.name} is not responding</h2>
          <p>The hub keeps checking every 30 seconds.</p>
          <div className="down-actions">
            <button onClick={onRetry}>Try again</button>
            <a href={project.adminUrl} target="_blank" rel="noreferrer">Open in new tab ↗</a>
          </div>
        </div>
      ) : noEmbed ? (
        <div className="down-panel">
          <h2>{project.name} opens in its own tab</h2>
          <p>This module does not allow embedding, so the hub links out to it instead.</p>
          <div className="down-actions">
            <a href={project.adminUrl} target="_blank" rel="noreferrer">Open {project.name} ↗</a>
          </div>
        </div>
      ) : ssoLoading ? (
        <div className="down-panel">
          <p>Connecting…</p>
        </div>
      ) : (
        <iframe
          key={`${project.id}-${frameKey}`}
          className="module-frame"
          title={project.name}
          src={buildFrameSrc(project, typeof hubToken === 'string' && hubToken !== 'loading' ? hubToken : null)}
          allow="clipboard-write; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      )}
    </main>
  );
}
