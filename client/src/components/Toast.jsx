import { useEffect } from 'react';

const TOAST_MS = 5000;

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <strong>{toast.from}</strong>
      {toast.text}
    </div>
  );
}
