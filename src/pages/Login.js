import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import logo from '../images/qara.png'

export default function App({ onLogin }) { // <-- добавил onLogin
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");           
  const [isLoading, setIsLoading] = useState(false); 
  const [loginStatus, setLoginStatus] = useState("idle");
  const [modalVisible, setModalVisible] = useState(false);

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
        // Добавляем передачу данных юзера
        if (onLogin) onLogin(data); // <-- это важно для редиректа

        setLoginStatus('success');

        setTimeout(() => navigate('/'), 500); // можно оставить, но App.js сам покажет Dashboard
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
        :root {
            --primary-color: #0b3d91;
            --secondary-color: #112e51;
            --accent-color: #d8b365;
            --light-bg: #f9f9f9;
            --error-color: #d83933;
            --success-color: #2e8540;
            --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        * {margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;}
        body,html,#root {height:100%;}
        body {background: linear-gradient(135deg,#112e51 0%,#0b3d91 100%); display:flex; justify-content:center; align-items:center; color:#333; position:relative; overflow:hidden;}
        body::before {content:"";position:absolute;top:0;left:0;width:100%;height:100%;background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");opacity:0.1;z-index:-1;}
        .container {width:100%; max-width:1200px; padding:20px; display:flex; justify-content:center; align-items:center;}
        .login-container {background-color:var(--light-bg); border-radius:12px; box-shadow:var(--box-shadow); overflow:hidden; width:100%; max-width:450px; animation:fadeIn 0.8s ease;}
        .header {background-color:var(--primary-color); color:white; padding:20px; text-align:center; position:relative;}
        .logo-container {margin-bottom:15px; display:flex; justify-content:center; align-items:center;}
        .logo {width:100px; height:100px; object-fit:contain; border-radius:50%; background-color:white; padding:5px; box-shadow:0 2px 10px rgba(0,0,0,0.3);}
        .title {font-size:22px; font-weight:600; margin-bottom:5px;}
        .subtitle {font-size:14px; opacity:0.9;}
        .login-body {padding:30px;}
        .form-group {margin-bottom:25px; position:relative;}
        .form-group label {display:block; margin-bottom:8px; font-weight:500; color:#444; font-size:16px;}
        .input-with-icon {position:relative;}
        .input-with-icon input {width:100%; padding:12px 45px 12px 15px; border:2px solid #ddd; border-radius:6px; font-size:16px; transition:all 0.3s ease;}
        .input-with-icon .icon {position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#888;}
        .input-with-icon input:focus {border-color:var(--primary-color); box-shadow:0 0 0 3px rgba(11,61,145,0.1); outline:none;}
        .input-with-icon input:focus + .icon {color:var(--primary-color);}
        .forgot-password {text-align:right; margin:-15px 0 20px;}
        .forgot-password a {color:var(--primary-color); font-size:14px; text-decoration:none; transition:all 0.3s ease;}
        .forgot-password a:hover {text-decoration:underline;}
        .login-btn {width:100%; padding:14px; background-color:var(--primary-color); color:white; border:none; border-radius:6px; font-size:16px; font-weight:600; cursor:pointer; transition:all 0.3s ease; display:flex; justify-content:center; align-items:center; gap:10px;}
        .login-btn:hover {background-color:var(--secondary-color); transform:translateY(-2px); box-shadow:0 4px 8px rgba(0,0,0,0.2);}
        .login-btn:active {transform:translateY(0); box-shadow:none;}
        .secure-note {margin-top:20px; text-align:center; font-size:13px; color:#666;}
        .secure-note i {color:var(--accent-color); margin-right:5px;}
        .system-status {position:absolute; top:15px; right:15px; display:flex; align-items:center;}
        .status-indicator {width:8px; height:8px; border-radius:50%; background-color:var(--success-color); margin-right:5px; animation:blink 1.5s infinite;}
        .status-text {font-size:12px; color:rgba(255,255,255,0.8);}
        .footer {margin-top:30px; text-align:center; color:rgba(255,255,255,0.7); font-size:12px;}
        .error-message {background-color: rgba(216, 57, 51, 0.1); color: var(--error-color); padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 14px; display:flex; align-items:center;}
        .error-message i {margin-right:5px;}
        #loginModal {position:fixed; z-index:100; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.7);}
        .modal-content {position:relative; background-color:var(--light-bg); margin:10% auto; padding:0; border-radius:10px; width:90%; max-width:450px; box-shadow:var(--box-shadow);}
        .modal-header {background-color:var(--primary-color); color:white; padding:15px 20px; border-radius:10px 10px 0 0; display:flex; justify-content:space-between; align-items:center;}
        .modal-header h2 {font-size:20px; font-weight:600;}
        .close {color:white; font-size:24px; font-weight:bold; cursor:pointer; transition:all 0.2s ease;}
        .close:hover {transform:scale(1.2);}
        .modal-body {padding:25px;}
        @keyframes fadeIn {from {opacity:0;} to {opacity:1;}}
        @keyframes blink {0%{opacity:0.4;}50%{opacity:1;}100%{opacity:0.4;}}
      `}</style>

      <div className="container">
        <div className="login-container">
          <div className="header">
            <div className="logo-container">
            <img src={logo} alt="qaraa" className="logo" />
            </div>
            <h1 className="title">qaraa</h1>
            <p className="subtitle">Система безопасного доступа</p>

            <div className="system-status">
              <div className="status-indicator"></div>
              <span className="status-text">Онлайн</span>
            </div>
          </div>

          <div className="login-body">
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">
                  <i className="fas fa-user-shield"></i> Идентификатор пользователя
                </label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    id="username"
                    placeholder="Введите логин"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <i className="fas fa-user icon"></i>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i> Пароль доступа
                </label>
                <div className="input-with-icon">
                  <input
                    type="password"
                    id="password"
                    placeholder="Введите пароль"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <i className="fas fa-lock icon"></i>
                </div>
              </div>

              <div className="forgot-password">
                <a href="#" onClick={(e) => { e.preventDefault(); setModalVisible(true); }}>
                  Забыли пароль?
                </a>
              </div>

              <button
                type="submit"
                className="login-btn"
                style={{
                  backgroundColor:
                    loginStatus === "success"
                      ? "var(--success-color)"
                      : loginStatus === "error"
                      ? "var(--error-color)"
                      : "var(--primary-color)",
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : loginStatus === "success" ? (
                  <i className="fas fa-check"></i>
                ) : loginStatus === "error" ? (
                  <i className="fas fa-times"></i>
                ) : (
                  <i className="fas fa-sign-in-alt"></i>
                )}
                {isLoading
                  ? " Проверка..."
                  : loginStatus === "success"
                  ? " Доступ разрешен"
                  : loginStatus === "error"
                  ? " Доступ запрещен"
                  : " Авторизация в системе"}
              </button>

              <div className="secure-note">
                <i className="fas fa-shield-alt"></i> Защищенное соединение. Авторизованный доступ.
                <br />
                <span style={{ fontWeight: '600' }}>by srk</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>Админ панель qaraa.kz &copy; 2025. Все права защищены.</p>
        <p>Несанкционированный доступ к данной системе запрещен и преследуется по закону.</p>
      </div>

      {modalVisible && (
        <div id="loginModal" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-key"></i> Восстановление доступа
              </h2>
              <span className="close" onClick={() => setModalVisible(false)}>
                &times;
              </span>
            </div>
            <div className="modal-body">
              <p>
                Для восстановления доступа обратитесь к администратору системы.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}