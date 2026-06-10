const DOT_TITLE = {
  online: 'online',
  error: 'responding with errors',
  down: 'not responding',
  pending: 'not connected yet',
  unknown: 'checking…',
};

export function Sidebar({ projects, statuses, selectedId, onSelect, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-chip" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </span>
        <div>
          <h1>ADMIN-LINK</h1>
          <p>mission control</p>
        </div>
      </div>
      <nav className="sidebar-projects">
        <p className="nav-label">Projects</p>
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
        <button className="logout" onClick={onLogout}>Sign out</button>
      </footer>
    </aside>
  );
}
