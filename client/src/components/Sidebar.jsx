import { Box, LayoutGrid, LogOut } from 'lucide-react';

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
          <LayoutGrid size={20} />
        </span>
        <div>
          <h1>ADMIN-LINK</h1>
          <p>mission control</p>
        </div>
      </div>
      <nav className="sidebar-projects">
        <p className="nav-label">Dashboard</p>
        <button
          className={`project-item overview-item ${selectedId === null ? 'selected' : ''}`}
          onClick={() => onSelect(null)}
        >
          <LayoutGrid className="nav-icon" size={16} aria-hidden="true" />
          <span className="project-name">Overview</span>
        </button>

        <p className="nav-label nav-label-gap">Projects</p>
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
              <Box className="nav-icon" size={16} aria-hidden="true" />
              <span className="project-name">{p.name}</span>
              <span className={`dot dot-${state}`} title={DOT_TITLE[state]} />
            </button>
          );
        })}
        {projects.length === 0 && <p className="sidebar-empty">No projects yet.</p>}
      </nav>
      <footer className="sidebar-footer">
        <button className="logout" onClick={onLogout}>
          <LogOut size={14} aria-hidden="true" />
          Sign out
        </button>
      </footer>
    </aside>
  );
}
