import { useState, useRef, useEffect } from 'react';

export default function JarvisPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ from: 'jarvis', text: 'Привет! Я готов.' }]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const user = { from: 'user', text: input.trim() };
    setMessages(prev => [...prev, user]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: user.text })
      });

      const data = await res.json();
      const jarvisMsg = { from: 'jarvis', text: data.text || 'Ошибка ответа.' };
      setMessages(prev => [...prev, jarvisMsg]);

      if (data.audio) {
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        new Audio(url).play().catch(() => {});
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: 'jarvis', text: 'Ошибка связи с сервером ИИ.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', background: '#0b0b0b', color: '#fff', minHeight: '100vh' }}>
      <h1>J.A.R.V.I.S</h1>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#111', padding: 16, borderRadius: 12 }}>
        <div style={{ height: 400, overflowY: 'auto', padding: 8, border: '1px solid #222', borderRadius: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ textAlign: m.from === 'user' ? 'right' : 'left', margin: '8px 0' }}>
              <div style={{ fontSize: 12, color: '#9aa' }}>{m.from === 'user' ? 'Вы' : 'J.A.R.V.I.S'}</div>
              <div style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: 12,
                background: m.from === 'user' ? '#0066cc' : '#222',
                color: '#fff',
                maxWidth: '80%'
              }}>{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Напиши сообщение..."
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} style={{ padding: '8px 16px', borderRadius: 8 }}>
            {isLoading ? '...' : 'Отправить'}
          </button>
        </form>
      </div>
    </div>
  );
}