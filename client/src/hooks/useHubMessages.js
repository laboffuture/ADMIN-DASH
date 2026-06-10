import { useEffect } from 'react';

// Listens for window messages from embedded modules. Only origins present in
// the registry (derived from each project's adminUrl) are accepted.
// v1 protocol: { type: 'notify', text: string } → onNotify(text, origin).
export function useHubMessages(projects, onNotify) {
  useEffect(() => {
    const allowed = new Set(
      projects
        .map((p) => {
          try {
            return new URL(p.adminUrl).origin;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    );

    function onMessage(event) {
      if (!allowed.has(event.origin)) return;
      const data = event.data;
      if (data && data.type === 'notify' && typeof data.text === 'string') {
        onNotify(data.text, event.origin);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [projects, onNotify]);
}
