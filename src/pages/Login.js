import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import logo from '../images/qara.png'

export default function App({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");           
  const [isLoading, setIsLoading] = useState(false); 
  const [loginStatus, setLoginStatus] = useState("idle");
  const [modalVisible, setModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('login')
        .select('*')
        .or(`email.eq.${username.trim()},username.eq.${username.trim()}`)
        .eq('password', password.trim())
        .single();

      if (error || !data) {
        setError('Неверный логин или пароль');
        setLoginStatus('error');

        setTimeout(() => {
          setLoginStatus('idle');
          setError('');
        }, 2000);
      } else {
        await supabase
          .from('login')
          .update({ is_online: true })
          .eq('id', data.id);

        await supabase
          .from('logs')
          .insert([{
            user_id: data.id,
            action: `${data.username} вошёл в систему`,
            created_at: new Date()
          }]);

        if (onLogin) onLogin({ ...data, is_online: true });

        setLoginStatus('success');

        setTimeout(() => navigate('/'), 500); 
      }
    } catch (err) {
      setError('Ошибка при авторизации');
      setLoginStatus('error');

      setTimeout(() => {
        setLoginStatus('idle');
        setError('');
      }, 2000);

      console.error('Login error:', err);
    }

    setIsLoading(false);
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-wrapper {
          width: 100%;
          max-width: 440px;
          padding: 24px;
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .logo-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 20px;
        }

        .logo-img {
          width: 80px;
          height: 80px;
          object-fit: contain;
          border-radius: 50%;
          background: #fff;
          padding: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .logo-img:hover {
          transform: scale(1.05);
        }

        .logo-title {
          font-size: 36px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -1.5px;
          margin-bottom: 8px;
        }

        .logo-subtitle {
          font-size: 14px;
          color: #6b7280;
          font-weight: 400;
        }

        .form-container {
          background: #ffffff;
          border-radius: 20px;
          padding: 44px 36px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(10px);
        }

        .form-title {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 32px;
        }

        .error-alert {
          background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
          border-left: 4px solid #ef4444;
          color: #dc2626;
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .input-group {
          margin-bottom: 24px;
        }

        .input-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 10px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
          width: 20px;
          height: 20px;
          transition: color 0.2s;
        }

        .input-field {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.3s;
          background: #fafafa;
        }

        .input-field:focus {
          outline: none;
          border-color: #1a1a1a;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.05);
        }

        .input-field:focus + .input-icon {
          color: #1a1a1a;
        }

        .password-toggle {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #1a1a1a;
        }

        .password-toggle svg {
          width: 20px;
          height: 20px;
        }

        .forgot-link {
          text-align: right;
          margin-top: -8px;
          margin-bottom: 28px;
        }

        .forgot-link a {
          color: #6b7280;
          font-size: 14px;
          text-decoration: none;
          transition: color 0.2s;
          font-weight: 500;
        }

        .forgot-link a:hover {
          color: #1a1a1a;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .submit-btn:hover::before {
          left: 100%;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .submit-btn.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .submit-btn.error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 28px 0;
          color: #9ca3af;
          font-size: 13px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .divider span {
          padding: 0 16px;
        }

        .footer-text {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
        }

        .features {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 20px;
          flex-wrap: wrap;
          opacity: 0.6;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .feature-item svg {
          width: 16px;
          height: 16px;
          color: #10b981;
          opacity: 0.7;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 24px;
          animation: fadeIn 0.2s ease;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #fff;
          border-radius: 20px;
          max-width: 440px;
          width: 100%;
          padding: 32px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
          animation: scaleIn 0.3s ease;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-close {
          background: #f3f4f6;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
          line-height: 1;
        }

        .modal-close:hover {
          background: #e5e7eb;
          color: #1a1a1a;
        }

        .modal-body {
          color: #6b7280;
          font-size: 15px;
          line-height: 1.7;
        }

        .modal-body p {
          margin-bottom: 16px;
        }

        .modal-body p:last-child {
          margin-bottom: 0;
        }

        .contact-info {
          background: #f9fafb;
          padding: 16px;
          border-radius: 12px;
          margin-top: 16px;
        }

        .contact-info strong {
          color: #1a1a1a;
          display: block;
          margin-bottom: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .icon-user, .icon-lock, .icon-arrow, .icon-check, .icon-x, .icon-alert {
          display: inline-block;
          width: 20px;
          height: 20px;
        }

        @media (max-width: 480px) {
          .login-wrapper {
            padding: 16px;
          }
          
          .form-container {
            padding: 32px 24px;
          }

          .logo-title {
            font-size: 32px;
          }

          .features {
            gap: 16px;
          }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="logo-section">
          <div className="logo-container">
            <img src={logo} alt="qaraa" className="logo-img" />
          </div>
          <h1 className="logo-title">qaraa</h1>
          <p className="logo-subtitle">Безопасная система управления</p>
        </div>

        <div className="form-container">
          <h2 className="form-title">Добро пожаловать</h2>
          <p className="form-subtitle">Войдите в систему для продолжения</p>

          {error && (
            <div className="error-alert">
              <svg className="icon-alert" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="username" className="input-label">
                Логин
              </label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  id="username"
                  className="input-field"
                  placeholder="Введите логин или email"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                Пароль
              </label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="input-field"
                  placeholder="Введите пароль"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: '48px' }}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="forgot-link">
              <a href="#" onClick={(e) => { e.preventDefault(); setModalVisible(true); }}>
                Забыли пароль?
              </a>
            </div>

            <button
              type="submit"
              className={`submit-btn ${loginStatus === "success" ? "success" : loginStatus === "error" ? "error" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spin" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }}></div>
                  Проверка данных...
                </>
              ) : loginStatus === "success" ? (
                <>
                  <svg className="icon-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Вход выполнен
                </>
              ) : loginStatus === "error" ? (
                <>
                  <svg className="icon-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Ошибка входа
                </>
              ) : (
                <>
                  Войти в систему
                  <svg className="icon-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            <div className="features">
              <div className="feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Защищено
              </div>
              <div className="feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Шифрование
              </div>
            </div>

<div className="footer">
  <p>Админ панель qaraa.crm | powered by Jarvis &copy; 2025.</p>
  <p>Все права защищены. <span style={{ fontWeight: '600' }}>by srk.</span></p>
</div>

<style>{`
  .footer {
    text-align: center;
    margin-top: 24px;
    padding: 16px;
    color: #000;
    font-size: 11px;
    line-height: 1.5;
    opacity: 0.6;
  }

  .footer p {
    margin: 0;
  }

  .footer p + p {
    margin-top: 4px;
  }

  @media (max-width: 480px) {
    .footer {
      font-size: 10px;
      padding: 12px;
    }
  }
`}</style>
          </form>
        </div>
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <svg className="icon-lock" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Восстановление доступа
              </h3>
              <button className="modal-close" onClick={() => setModalVisible(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Для восстановления доступа к системе обратитесь к администратору.
              </p>
              <div className="contact-info">
  <strong>Контактная информация</strong>
  
  {/* <div className="contact-item">
    <svg className="contact-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    <div>
      <span className="contact-label">Email</span>
      <span className="contact-value">admin@qaraa.kz</span>
    </div>
  </div> */}

  <div className="contact-item">
    <svg className="contact-icon telegram-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.154.232.17.326.016.094.036.308.02.475z"/>
    </svg>
    <div>
      <span className="contact-label">Telegram</span>
      <a 
        href="https://t.me/sssssrkd" 
        target="_blank" 
        rel="noopener noreferrer"
        className="contact-value telegram-link"
      >
        @sssssrkd
      </a>
    </div>
  </div>

  {/* <div className="contact-item">
    <svg className="contact-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <span className="contact-label">Время работы</span>
      <span className="contact-value">9:00 - 18:00 (GMT+6)</span>
    </div>
  </div> */}
</div>

<style>{`
  .contact-info {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    padding: 20px;
    border-radius: 14px;
    margin-top: 20px;
    border: 1px solid #e5e7eb;
  }

  .contact-info strong {
    color: #1a1a1a;
    display: block;
    margin-bottom: 16px;
    font-size: 15px;
    font-weight: 600;
  }

  .contact-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
    padding: 12px;
    background: #fff;
    border-radius: 10px;
    transition: all 0.2s;
  }

  .contact-item:last-child {
    margin-bottom: 0;
  }

  .contact-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transform: translateX(2px);
  }

  .contact-icon {
    width: 20px;
    height: 20px;
    min-width: 20px;
    color: #6b7280;
    margin-top: 2px;
  }

  .telegram-icon {
    color: #0088cc;
  }

  .contact-item > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .contact-label {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .contact-value {
    font-size: 14px;
    color: #374151;
    font-weight: 500;
  }

  .telegram-link {
    color: #0088cc;
    text-decoration: none;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .telegram-link:hover {
    color: #006699;
    text-decoration: underline;
  }

  .telegram-link::after {
    content: '→';
    font-size: 12px;
    opacity: 0;
    transform: translateX(-4px);
    transition: all 0.2s;
  }

  .telegram-link:hover::after {
    opacity: 1;
    transform: translateX(0);
  }
`}</style>
            </div>
          </div>
        </div>
      )}
    </>
  );
}