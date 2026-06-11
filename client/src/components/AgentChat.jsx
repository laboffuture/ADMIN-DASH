import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const GREETING = "Hey! What's up? I'm Clawd — I keep an eye on the whole place. Ask me how things are going.";
const OFFLINE = "Hmm, I can't reach the hub brain right now — try again in a moment.";

export function AgentChat({ onClose }) {
  const [messages, setMessages] = useState([{ from: 'clawd', text: GREETING }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const question = text.trim();
    if (!question || busy) return;
    setText('');
    setBusy(true);
    setMessages((cur) => [...cur, { from: 'me', text: question }]);
    try {
      const { reply } = await api.agentChat(question);
      setMessages((cur) => [...cur, { from: 'clawd', text: reply }]);
    } catch {
      setMessages((cur) => [...cur, { from: 'clawd', text: OFFLINE }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="agent-chat" aria-label="Clawd, the hub agent">
      <header className="agent-chat-head">
        <span className="agent-chat-title">CLAWD</span>
        <span className="agent-chat-sub">hub agent</span>
        <button className="agent-chat-close" aria-label="Close chat" onClick={onClose}>×</button>
      </header>
      <div className="agent-msgs" ref={logRef}>
        {messages.map((m, i) => (
          <p key={i} className={`agent-msg agent-msg-${m.from}`}>{m.text}</p>
        ))}
        {busy && <p className="agent-msg agent-msg-clawd agent-msg-thinking">…</p>}
      </div>
      <form className="agent-input" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Clawd…"
          disabled={busy}
          autoFocus
        />
        <button type="submit" disabled={busy || !text.trim()}>Send</button>
      </form>
    </section>
  );
}
