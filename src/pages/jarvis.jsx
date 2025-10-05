import React, { useState, useCallback, useRef, useEffect } from 'react';
import jarvisIcon from '../images/jarvis.png';

function Jarvis() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'jarvis', text: 'Привет! Я готов к работе.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const originalTitle = document.title;
    const originalIcon = document.querySelector("link[rel~='icon']");
  
    // Сохраняем старый favicon
    const originalIconHref = originalIcon ? originalIcon.href : null;
  
    // Меняем title
    document.title = 'Jarvis AI';
  
    // Меняем favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = jarvisIcon;
    document.head.appendChild(link);
  
    // Убираем созданный link при уходе и возвращаем старый
    return () => {
      document.title = originalTitle;
      if (link) document.head.removeChild(link);
      if (originalIcon && originalIconHref) {
        originalIcon.href = originalIconHref;
      }
    };
  }, []);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { from: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const res = await fetch('/api/jarvis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userMsg.text })
          });

      const data = await res.json();

      const jarvisMsg = {
        from: 'jarvis',
        text: data.text || 'Произошла ошибка. Сервер вернул пустой ответ.'
      };

      setMessages(prev => [...prev, jarvisMsg]);

      if (data.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        new Audio(audioUrl).play();
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { from: 'jarvis', text: 'Ошибка связи с сервером ИИ.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f0f1e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Segoe UI', 'Roboto', sans-serif"
    }}>
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 170, 255, 0.4), 0 0 40px rgba(0, 170, 255, 0.2); }
          50% { box-shadow: 0 0 30px rgba(0, 170, 255, 0.6), 0 0 60px rgba(0, 170, 255, 0.3); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .glow-border {
          animation: glow 2s ease-in-out infinite;
        }
        .message-enter {
          animation: slideUp 0.3s ease-out;
        }
        .scrollbar-custom::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #00aaff, #0066cc);
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #00ccff, #0088ff);
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '900px',
        background: 'rgba(20, 20, 40, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        border: '1px solid rgba(0, 170, 255, 0.3)',
        overflow: 'hidden'
      }} className="glow-border">
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(0, 170, 255, 0.1) 0%, rgba(0, 102, 204, 0.1) 100%)',
          padding: '24px',
          borderBottom: '1px solid rgba(0, 170, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00aaff, #0066cc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 20px rgba(0, 170, 255, 0.5)'
          }} className="glow-border">
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0,
              color: '#00aaff',
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '1px'
            }}>
              J.A.R.V.I.S
            </h2>
            <p style={{
              margin: 0,
              color: 'rgba(0, 170, 255, 0.7)',
              fontSize: '13px',
              fontWeight: '400'
            }}>
              Just A Rather Very Intelligent System
            </p>
          </div>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#00ff88',
            boxShadow: '0 0 10px #00ff88'
          }} className="glow-border" />
        </div>

        {/* Messages Area */}
        <div style={{
          height: '500px',
          overflowY: 'auto',
          padding: '24px',
          background: 'linear-gradient(180deg, rgba(10, 10, 30, 0.5) 0%, rgba(15, 15, 40, 0.5) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }} className="scrollbar-custom">
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }} className="message-enter">
              <div style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                paddingLeft: msg.from === 'user' ? '0' : '12px',
                paddingRight: msg.from === 'user' ? '12px' : '0',
                textAlign: msg.from === 'user' ? 'right' : 'left'
              }}>
                {msg.from === 'user' ? 'Вы' : 'J.A.R.V.I.S'}
              </div>
              <div style={{
                background: msg.from === 'user' 
                  ? 'linear-gradient(135deg, #0066cc, #0088ff)' 
                  : 'rgba(30, 30, 60, 0.8)',
                color: '#fff',
                padding: '14px 18px',
                borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                wordBreak: 'break-word',
                lineHeight: '1.5',
                border: msg.from === 'jarvis' ? '1px solid rgba(0, 170, 255, 0.3)' : 'none',
                boxShadow: msg.from === 'user' 
                  ? '0 4px 15px rgba(0, 102, 204, 0.4)' 
                  : '0 4px 15px rgba(0, 0, 0, 0.3)',
                fontSize: '15px'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '75%'
            }} className="message-enter">
              <div style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                paddingLeft: '12px'
              }}>
                J.A.R.V.I.S
              </div>
              <div style={{
                background: 'rgba(30, 30, 60, 0.8)',
                color: '#00aaff',
                padding: '14px 18px',
                borderRadius: '18px 18px 18px 4px',
                border: '1px solid rgba(0, 170, 255, 0.3)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}>
                <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>●</span>
                <span style={{ animation: 'pulse 1s ease-in-out infinite 0.2s' }}>●</span>
                <span style={{ animation: 'pulse 1s ease-in-out infinite 0.4s' }}>●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '24px',
          background: 'rgba(15, 15, 35, 0.8)',
          borderTop: '1px solid rgba(0, 170, 255, 0.2)'
        }}>
          <form onSubmit={handleSend} style={{
            display: 'flex',
            gap: '12px'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введите команду для J.A.R.V.I.S..."
              disabled={isLoading}
              style={{
                flexGrow: 1,
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 170, 255, 0.3)',
                outline: 'none',
                background: 'rgba(20, 20, 40, 0.8)',
                color: '#fff',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                opacity: isLoading ? 0.6 : 1
              }}
              onFocus={(e) => e.target.style.border = '1px solid rgba(0, 170, 255, 0.6)'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(0, 170, 255, 0.3)'}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: 'none',
                background: isLoading 
                  ? 'rgba(100, 100, 120, 0.5)' 
                  : 'linear-gradient(135deg, #00aaff, #0066cc)',
                color: '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(0, 170, 255, 0.4)',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 25px rgba(0, 170, 255, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 20px rgba(0, 170, 255, 0.4)';
                }
              }}
            >
              {isLoading ? 'Обработка...' : 'Отправить'}
            </button>
          </form>

          <p style={{
            marginTop: '16px',
            marginBottom: 0,
            textAlign: 'center',
            color: 'rgba(0, 170, 255, 0.6)',
            fontSize: '13px',
            letterSpacing: '0.5px'
          }}>
            Powered by Gemini AI + ElevenLabs Voice Synthesis
          </p>
        </div>
      </div>
    </div>
  );
}

export default Jarvis;