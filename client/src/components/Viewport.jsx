import { useState } from 'react';

function embedUrl(adminUrl) {
  return adminUrl + (adminUrl.includes('?') ? '&' : '?') + 'embed=1';
}

export function Viewport({ project, status, onRetry }) {
  const [frameKey, setFrameKey] = useState(0);

  if (!project) {
    return (
      <main className="viewport viewport-empty">
        <p>Select a project</p>
      </main>
    );
  }

  const notConnected = !project.adminUrl;
  const down = status && status.status === 'down';

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
      ) : (
        <iframe
          key={`${project.id}-${frameKey}`}
          className="module-frame"
          title={project.name}
          src={embedUrl(project.adminUrl)}
        />
      )}
    </main>
  );
}
