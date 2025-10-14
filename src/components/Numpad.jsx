import React from 'react';

/**
 * Виртуальная цифровая клавиатура для сенсорных экранов
 * Используется для ввода сумм при оплате наличными и смешанной оплате
 */
export default function Numpad({ value, onChange, onClose }) {
  const handleClick = (digit) => {
    // Добавляем цифру к текущему значению
    const newValue = value + digit;
    onChange(newValue);
  };

  const handleDot = () => {
    // Добавляем точку, если её еще нет
    if (!value.includes('.')) {
      onChange(value + '.');
    }
  };

  const handleBackspace = () => {
    // Удаляем последний символ
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    // Очищаем все
    onChange('');
  };

  const handleDone = () => {
    // Закрываем клавиатуру
    onClose();
  };

  // Кнопки клавиатуры
  const buttons = [
    { label: '1', value: '1', type: 'number' },
    { label: '2', value: '2', type: 'number' },
    { label: '3', value: '3', type: 'number' },
    { label: '4', value: '4', type: 'number' },
    { label: '5', value: '5', type: 'number' },
    { label: '6', value: '6', type: 'number' },
    { label: '7', value: '7', type: 'number' },
    { label: '8', value: '8', type: 'number' },
    { label: '9', value: '9', type: 'number' },
    { label: '.', value: '.', type: 'dot' },
    { label: '0', value: '0', type: 'number' },
    { label: '⌫', value: 'backspace', type: 'backspace' },
  ];

  return (
    <>
      <style>{`
        @keyframes numpadSlideUp {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes numpadFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'numpadFadeIn 0.2s ease'
        }}
        onClick={onClose}
      />

      {/* Numpad Container */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          borderRadius: '24px 24px 0 0',
          padding: '24px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          maxWidth: '500px',
          margin: '0 auto',
          animation: 'numpadSlideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div style={{
          width: '40px',
          height: '5px',
          background: '#e5e7eb',
          borderRadius: '10px',
          margin: '0 auto 20px'
        }} />

        {/* Display */}
        <div style={{
          background: '#f3f4f6',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'right',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: value ? '#1a1a1a' : '#9ca3af',
            letterSpacing: '-1px'
          }}>
            {value || '0'}
            <span style={{
              fontSize: '32px',
              marginLeft: '4px',
              color: '#6b7280'
            }}>₸</span>
          </div>
        </div>

        {/* Number Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => {
                if (btn.type === 'number') handleClick(btn.value);
                else if (btn.type === 'dot') handleDot();
                else if (btn.type === 'backspace') handleBackspace();
              }}
              style={{
                padding: '24px',
                fontSize: btn.type === 'backspace' ? '28px' : '32px',
                fontWeight: '600',
                background: btn.type === 'backspace' ? '#fee2e2' : '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: btn.type === 'backspace' ? '#dc2626' : '#1a1a1a',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'scale(0.95)';
                e.target.style.background = btn.type === 'backspace' ? '#fecaca' : '#f3f4f6';
              }}
              onMouseUp={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.background = btn.type === 'backspace' ? '#fee2e2' : '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.background = btn.type === 'backspace' ? '#fee2e2' : '#f9fafb';
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: '20px',
              fontSize: '18px',
              fontWeight: '600',
              background: '#f3f4f6',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#6b7280',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'scale(0.95)';
              e.target.style.background = '#e5e7eb';
            }}
            onMouseUp={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.background = '#f3f4f6';
            }}
          >
            Очистить
          </button>
          
          <button
            onClick={handleDone}
            style={{
              flex: 2,
              padding: '20px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'scale(0.95)';
              e.target.style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.3)';
            }}
            onMouseUp={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
          >
            Готово ✓
          </button>
        </div>
      </div>
    </>
  );
}

