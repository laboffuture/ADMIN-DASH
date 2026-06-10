import { useEffect, useState } from 'react';
import { api } from './api';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [authed, setAuthed] = useState(null); // null = checking session

  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="boot">ADMIN-LINK</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}
