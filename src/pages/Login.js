import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import logo from '../images/qara.png'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('login')
        .select('*')
        .or(`email.eq.${username.trim()},username.eq.${username.trim()}`)
        .eq('password', password.trim())
        .single()

      if (error || !data) {
        setError('Неверный логин или пароль')
      } else {
        onLogin(data)
        navigate('/')
      }
    } catch (err) {
      setError('Ошибка при авторизации')
      console.error('Login error:', err)
    }

    setIsLoading(false)
  }

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <i className="fas fa-spinner fa-spin"></i>
          Проверка...
        </>
      )
    }
    return (
      <>
        <i className="fas fa-sign-in-alt"></i>
        Авторизация в системе
      </>
    )
  }

  const styles = {
    container: { 
      width: '100%', 
      minHeight: '100vh',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #112e51 0%, #0b3d91 100%)'
    },
    pattern: { 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      opacity: 0.1,
      zIndex: 0
    },
    loginContainer: { 
      backgroundColor: '#f9f9f9', 
      borderRadius: '12px', 
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', 
      overflow: 'hidden', 
      width: '100%', 
      maxWidth: '450px', 
      position: 'relative',
      zIndex: 1
    },
    header: { backgroundColor: '#0b3d91', color: 'white', padding: '20px', textAlign: 'center', position: 'relative' },
    logoContainer: { marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    logoImage: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'white', padding: '5px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)', objectFit: 'cover' },
    title: { fontSize: '22px', fontWeight: '600', marginBottom: '5px' },
    subtitle: { fontSize: '14px', opacity: '0.9' },
    systemStatus: { position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center' },
    statusIndicator: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2e8540', marginRight: '5px', animation: 'blink 1.5s infinite' },
    statusText: { fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' },
    loginBody: { padding: '30px' },
    formGroup: { marginBottom: '25px', position: 'relative' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444', fontSize: '16px' },
    inputWithIcon: { position: 'relative' },
    input: { width: '100%', padding: '12px 45px 12px 15px', border: '2px solid #ddd', borderRadius: '6px', fontSize: '16px', transition: 'all 0.3s ease', outline: 'none', boxSizing: 'border-box' },
    icon: { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888', cursor: 'pointer' },
    forgotPassword: { textAlign: 'right', margin: '-15px 0 20px' },
    forgotPasswordLink: { color: '#0b3d91', fontSize: '14px', textDecoration: 'none', cursor: 'pointer' },
    loginBtn: { width: '100%', padding: '14px', backgroundColor: '#0b3d91', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
    secureNote: { marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#666' },
    errorMessage: { backgroundColor: 'rgba(216, 57, 51, 0.1)', color: '#d83933', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontSize: '14px', display: error ? 'flex' : 'none', alignItems: 'center' },
    modal: { display: showModal ? 'block' : 'none', position: 'fixed', zIndex: '100', left: '0', top: '0', width: '100%', height: '100%', overflow: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalContent: { position: 'relative', backgroundColor: '#f9f9f9', margin: '10% auto', padding: '0', borderRadius: '10px', width: '90%', maxWidth: '450px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' },
    modalHeader: { backgroundColor: '#0b3d91', color: 'white', padding: '15px 20px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalHeaderTitle: { fontSize: '20px', fontWeight: '600' },
    close: { color: 'white', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer' },
    modalBody: { padding: '25px' }
  }

  // Подсветка input при фокусе
  useEffect(() => {
    const inputs = document.querySelectorAll('input')
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.style.boxShadow = '0 0 0 3px rgba(11, 61, 145, 0.1)'
      })
      input.addEventListener('blur', function() {
        this.parentElement.style.boxShadow = 'none'
      })
    })
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.pattern}></div>

      <div style={styles.loginContainer}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src={logo} alt="qaraa logo" style={styles.logoImage} />
          </div>
          <h1 style={styles.title}>qaraa</h1>
          <p style={styles.subtitle}>Система безопасного доступа</p>
          <div style={styles.systemStatus}>
            <div style={styles.statusIndicator}></div>
            <span style={styles.statusText}>Онлайн</span>
          </div>
        </div>

        <div style={styles.loginBody}>
          <div style={styles.errorMessage}>
            <i className="fas fa-exclamation-circle" style={{marginRight: '5px'}}></i>
            <span>{error}</span>
          </div>

          <form onSubmit={handleLogin}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-user-shield"></i> Идентификатор пользователя
              </label>
              <div style={styles.inputWithIcon}>
                <input
                  type="text"
                  placeholder="Введите логин"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={styles.input}
                />
                <i className="fas fa-user" style={styles.icon}></i>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-lock"></i> Пароль доступа
              </label>
              <div style={styles.inputWithIcon}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                />
                <i
                  className="fas fa-eye"
                  style={styles.icon}
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                ></i>
              </div>
            </div>

            <div style={styles.forgotPassword}>
              <a 
                href="#" 
                style={styles.forgotPasswordLink}
                onClick={(e) => {
                  e.preventDefault()
                  setShowModal(true)
                }}
              >
                Забыли пароль?
              </a>
            </div>

            <button 
              type="submit" 
              style={styles.loginBtn}
              disabled={isLoading}
            >
              {getButtonContent()}
            </button>

            <div style={styles.secureNote}>
              <i className="fas fa-shield-alt" style={{ marginRight: '5px' }}></i>
              Защищенное соединение. Авторизованный доступ.
              <br />
              <span style={{ fontWeight: '600' }}>by srk</span>
            </div>
          </form>
        </div>
      </div>

      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalHeaderTitle}>
              <i className="fas fa-key" style={{marginRight: '10px'}}></i>
              Восстановление доступа
            </h2>
            <span 
              style={styles.close}
              onClick={() => setShowModal(false)}
            >
              &times;
            </span>
          </div>
          <div style={styles.modalBody}>
            <p style={{marginBottom: '20px'}}>
              Для восстановления доступа обратитесь к администратору системы.
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes blink {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  )
}