import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../api';
import { LoginBackdrop } from './LoginBackdrop';

// Etched routing in the panel corners — the hub wires 15 systems together,
// so the surface carries the traces.
function Trace({ className }) {
  return (
    <svg className={className} viewBox="0 0 132 132" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 34h22l14-14h26" />
        <path d="M0 62h40l16-16h22" />
        <path d="M34 132V96l14-14V58" />
        <path d="M62 132v-22l16-16" />
      </g>
      <g fill="currentColor">
        <circle cx="66" cy="20" r="3" />
        <circle cx="82" cy="46" r="3" />
        <circle cx="48" cy="58" r="3" />
        <circle cx="78" cy="94" r="3" />
      </g>
    </svg>
  );
}

export function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err.status === 401 ? 'Invalid password' : 'Could not reach the hub server');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <LoginBackdrop />
      <form className="login-card" onSubmit={submit}>
        <Trace className="login-trace login-trace-tl" />
        <Trace className="login-trace login-trace-tr" />
        <Trace className="login-trace login-trace-bl" />
        <Trace className="login-trace login-trace-br" />

        <span className="login-well">
          {logoBroken ? (
            <Lock size={26} aria-hidden="true" />
          ) : (
            <img src="/lof-logotype.png" alt="" onError={() => setLogoBroken(true)} />
          )}
        </span>

        <h1>ADMIN-DASH</h1>

        <div className="login-field">
          <Lock className="login-field-icon" size={15} aria-hidden="true" />
          <input
            type={reveal ? 'text' : 'password'}
            placeholder="Admin password"
            aria-label="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="login-reveal"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <p className="login-error" role="alert">{error}</p>}

        <button type="submit" className="login-submit" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login-foot">Lab of Future · internal system</p>
      </form>
    </div>
  );
}
