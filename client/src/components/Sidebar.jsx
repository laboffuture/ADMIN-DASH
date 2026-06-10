const DOT_TITLE = {
  online: 'online',
  error: 'responding with errors',
  down: 'not responding',
  unknown: 'checking…',
};

export function Sidebar({ projects, statuses, selectedId, onSelect, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>ADMIN-LINK</h1>
        <p>all projects · one place</p>
      </div>
      <nav className="sidebar-projects">
        {projects.map((p) => {
          const st = statuses[p.id];
          const state = st ? st.status : 'unknown';
          return (
            <button
              key={p.id}
              className={`project-item ${p.id === selectedId ? 'selected' : ''}`}
              onClick={() => onSelect(p.id)}
              style={p.accent ? { '--accent': p.accent } : undefined}
            >
              <span className={`dot dot-${state}`} title={DOT_TITLE[state]} />
              <span className="project-name">{p.name}</span>
              {st && st.latencyMs != null && <span className="latency">{st.latencyMs}ms</span>}
            </button>
          );
        })}
        {projects.length === 0 && <p className="sidebar-empty">No projects yet.</p>}
      </nav>
      <footer className="sidebar-footer">
        <p>add a project → edit projects.json</p>
        <button className="logout" onClick={onLogout}>Sign out</button>
      </footer>
    </aside>
  );
}
