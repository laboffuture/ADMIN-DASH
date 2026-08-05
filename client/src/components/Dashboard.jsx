import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { HubPet } from './HubPet';
import { Viewport } from './Viewport';
import { Overview } from './Overview';
import { Toast } from './Toast';
import { useHubMessages } from '../hooks/useHubMessages';

const STATUS_POLL_MS = 30000;

export function Dashboard({ onLogout }) {
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  const refreshStatuses = useCallback(() => {
    api.status().then(setStatuses).catch(() => {});
  }, []);

  useEffect(() => {
    api.projects().then(setProjects).catch(() => {});
    refreshStatuses();
    const timer = setInterval(refreshStatuses, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshStatuses]);

  const notify = useCallback(
    (text, origin) => {
      const match = projects.find((p) => {
        try {
          return new URL(p.adminUrl).origin === origin;
        } catch {
          return false;
        }
      });
      setToasts((cur) => [
        ...cur,
        { id: nextToastId.current++, text, from: match ? match.name : origin },
      ]);
    },
    [projects],
  );

  useHubMessages(projects, notify);

  const dismissToast = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  function handleLogout() {
    api.logout().catch(() => {}).finally(onLogout);
  }

  const selected = projects.find((p) => p.id === selectedId) || null;

  return (
    <div className="hub-layout">
      <Sidebar
        projects={projects}
        statuses={statuses}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onLogout={handleLogout}
      />
      <div className="hub-main">
        <Topbar />
        {selected ? (
          <Viewport project={selected} status={statuses[selected.id]} onRetry={refreshStatuses} />
        ) : (
          <Overview projects={projects} statuses={statuses} onSelect={setSelectedId} />
        )}
        <HubPet />
      </div>
      <div className="toasts">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
