import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Dashboard({ user, onLogout }) {
  const [sellers, setSellers] = useState([]);
  const [onlineSellers, setOnlineSellers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('all');
  const [sales, setSales] = useState([]);

  const navigate = useNavigate();
  const loggedOnce = useRef(false);  

  // === EFFECT ДЛЯ OWNER ===
  useEffect(() => {
    let interval;

    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error('Ошибка загрузки продаж:', error);
      else setSales(data);
    };

    const fetchSellers = async () => {
      const { data, error } = await supabase.from('login').select('*').eq('role', 'seller');
      if (error) console.error('Ошибка при загрузке продавцов:', error);
      else {
        setSellers(data);
        setOnlineSellers(data.filter(s => s.is_online));
      }
    };

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Ошибка загрузки логов:', error);
      else setLogs(data);
    };

    const handleBeforeUnload = async (event) => {
      if (user.role === 'seller') {
        await markOnline(user.id, false);
        await logAction('Вышел из системы', false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (user.role === 'owner') {
      fetchSellers();
      fetchLogs();
      fetchSales();
      interval = setInterval(() => {
        fetchSellers();
        fetchLogs();
        fetchSales();
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (interval) clearInterval(interval);
    };
  }, [user]);

  // === Функции ===
  const markOnline = async (id, status) => {
    const { error } = await supabase.from('login').update({ is_online: status }).eq('id', id);
    if (error) console.error('Ошибка при обновлении статуса онлайн:', error);
  };

  const addSeller = async () => {
    const email = prompt("Email нового продавца:");
    const password = prompt("Пароль нового продавца:");
    const username = prompt("Логин нового продавца:");
    const fullname = prompt("Полное имя нового продавца:");

    if (!email || !password || !username || !fullname) return alert("Все поля обязательны!");

    const { error } = await supabase.from('login').insert([{ email, password, username, fullname, role: 'seller', is_online: false }]);
    if (error) alert('Ошибка при добавлении продавца: ' + error.message);
    else {
      alert('Продавец добавлен');
      fetchSellers();
      addLog(fullname, 'Добавлен как новый продавец');
    }
  };

  const removeSeller = async (id, fullname) => {
    if (!window.confirm('Вы точно хотите удалить продавца?')) return;

    const { error } = await supabase.from('login').delete().eq('id', id);
    if (error) alert('Ошибка при удалении продавца');
    else {
      fetchSellers();
      addLog(fullname, 'Удалён из системы');
    }
  };

  const addLog = async (fullname, action, doFetch = true) => {
    const now = new Date();
    const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { error } = await supabase.from('logs').insert([{ fullname, action, created_at: almatyTime }]);
    if (error) console.error('Ошибка добавления лога:', error);
    else if (doFetch) fetchLogs();
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Ошибка загрузки логов:', error);
    else setLogs(data);
  };

  // === ЛОГИН ПРИ ВХОДЕ (только один раз) ===
  useEffect(() => {
    const logLogin = async () => {
      if (!user) return;
      const now = new Date();
      const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const { error } = await supabase.from('logs').insert([{
        fullname: user.fullname,
        action: 'Вошёл в систему',
        created_at: almatyTime
      }]);
      if (error) console.error('Ошибка при добавлении лога входа:', error);
    };

    if (!loggedOnce.current) {
      loggedOnce.current = true;
      logLogin();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user.role === 'seller') {
      await markOnline(user.id, false);
      await logAction('Вышел из системы');
    }
    onLogout();
  };

  const logAction = async (action, doFetch = true) => {
    if (!user) return;
    const now = new Date();
    const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { error } = await supabase.from('logs').insert([{ fullname: user.fullname, action, created_at: almatyTime }]);
    if (error) console.error('Ошибка добавления лога:', error);
    if (doFetch) fetchLogs();
  };

  // === КОМПОНЕНТЫ ===
  const OverviewTab = () => (
    <div className="overview-content">
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon users"><i className="fas fa-users"></i></div>
          <div className="stat-info">
            <div className="stat-number">{sellers.length}</div>
            <div className="stat-label">Всего продавцов</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon online"><i className="fas fa-user-check"></i></div>
          <div className="stat-info">
            <div className="stat-number">{onlineSellers.length}</div>
            <div className="stat-label">В сети сейчас</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon logs"><i className="fas fa-clipboard-list"></i></div>
          <div className="stat-info">
            <div className="stat-number">{logs.length}</div>
            <div className="stat-label">Записей в логе</div>
          </div>
        </div>
      </div>

      <div className="main-grid">
        <div className="activity-section">
          <div className="section-header">
            <div className="section-icon"><i className="fas fa-history"></i></div>
            <h3>Последняя активность</h3>
          </div>
          <div className="activity-list">
            {logs.slice(0, 6).map((log, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-avatar">
                  <i className={`fas ${
                    log.action.includes('Вошёл') ? 'fa-sign-in-alt' : 
                    log.action.includes('Вышел') ? 'fa-sign-out-alt' : 
                    'fa-user-plus'
                  }`}></i>
                </div>
                <div className="activity-details">
                  <div className="activity-text">
                    <strong>{log.fullname}</strong> {log.action.toLowerCase()}
                  </div>
                  <div className="activity-time">
                    {new Date(log.created_at).toLocaleString('ru-RU', { 
                      timeZone: 'Asia/Almaty',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="online-section">
          <div className="section-header">
            <div className="section-icon"><i className="fas fa-users-cog"></i></div>
            <h3>Продавцы в сети</h3>
          </div>
          <div className="online-list">
            {onlineSellers.map(seller => (
              <div key={seller.id} className="online-item">
                <div className="online-avatar"><i className="fas fa-user"></i></div>
                <div className="online-info">
                  <div className="online-name">{seller.fullname}</div>
                  <div className="online-username">@{seller.username}</div>
                </div>
                <div className="status-indicator online"></div>
              </div>
            ))}
            {onlineSellers.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-users-slash"></i>
                <p>Нет активных продавцов</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SellersTab = () => (
    <div className="sellers-content">
      <div className="section-header">
        <div className="section-icon">
          <i className="fas fa-users-cog"></i>
        </div>
        <h3>Управление продавцами</h3>
        <button className="add-seller-btn" onClick={addSeller}>
          <i className="fas fa-plus"></i>
          Добавить продавца
        </button>
      </div>
      
      <div className="sellers-grid">
        {sellers.map(seller => (
          <div key={seller.id} className="seller-card">
            <div className="seller-header">
              <div className="seller-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className={`seller-status ${seller.is_online ? 'online' : 'offline'}`}>
                <i className={`fas ${seller.is_online ? 'fa-circle' : 'fa-circle'}`}></i>
                {seller.is_online ? 'В сети' : 'Не в сети'}
              </div>
            </div>
            
            <div className="seller-info">
              <h4 className="seller-name">{seller.fullname}</h4>
              <p className="seller-username">@{seller.username}</p>
              <p className="seller-email">{seller.email}</p>
            </div>
            
            <div className="seller-actions">
              <button className="delete-btn" onClick={() => removeSeller(seller.id, seller.fullname)}>
                <i className="fas fa-trash"></i>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const LogsTab = () => {
    // Фильтруем логи по типу события
    const filteredLogs = logs.filter(log => {
        const action = log.action.toLowerCase();
        if (logFilter === 'all') return true;
        if (logFilter === 'login') return action.includes('вошёл');
        if (logFilter === 'logout') return action.includes('вышел');
        if (logFilter === 'sale') return action.includes('продаж'); 
        return true;
      });
  
    return (
      <div className="logs-content">
        <div className="section-header">
          <div className="section-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <h3>Журнал активности</h3>
          <div className="filter-buttons">
            <button 
              onClick={() => setLogFilter('all')} 
              className={`filter-btn ${logFilter === 'all' ? 'active' : ''}`}
            >
              <i className="fas fa-list"></i>
              Все
            </button>
            <button 
              onClick={() => setLogFilter('login')} 
              className={`filter-btn ${logFilter === 'login' ? 'active' : ''}`}
            >
              <i className="fas fa-sign-in-alt"></i>
              Вход
            </button>
            <button 
              onClick={() => setLogFilter('logout')} 
              className={`filter-btn ${logFilter === 'logout' ? 'active' : ''}`}
            >
              <i className="fas fa-sign-out-alt"></i>
              Выход
            </button>
            {/* <button 
              onClick={() => setLogFilter('sale')} 
              className={`filter-btn ${logFilter === 'sale' ? 'active' : ''}`}
            >
              <i className="fas fa-shopping-cart"></i>
              Продажи
            </button> */}
          </div>
        </div>
        
        <div className="logs-list">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="log-item">
              <div className="log-icon">
                <i className={`fas ${
                  log.action.includes('Вошёл') ? 'fa-sign-in-alt' : 
                  log.action.includes('Вышел') ? 'fa-sign-out-alt' : 
                  log.action.includes('продаж') ? 'fa-shopping-cart' : 
                  'fa-user-plus'
                }`}></i>
              </div>
              <div className="log-content">
                <div className="log-text">
                  <strong>{log.fullname}</strong> {log.action.toLowerCase()}
                </div>
                <div className="log-time">
                  {new Date(log.created_at).toLocaleString('ru-RU', { 
                    timeZone: 'Asia/Almaty',
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SellerDashboard = () => (
    <div className="seller-dashboard">
      <div className="welcome-section">
        <div className="section-header">
          <div className="section-icon">
            <i className="fas fa-store"></i>
          </div>
          <h3>Рабочее место продавца</h3>
        </div>
        <p className="welcome-text">Добро пожаловать в систему продаж qaraa</p>
      </div>
      
      <div className="actions-grid">
        <div className="action-card">
          <div className="action-icon new-sale">
            <i className="fas fa-plus-circle"></i>
          </div>
          <div className="action-content">
            <h4>Новая продажа</h4>
            <p>Оформить продажу товара</p>
            <button className="action-btn primary" onClick={() => navigate('/new-sale')}>
              Начать продажу
            </button>
          </div>
        </div>
        
        <div className="action-card">
          <div className="action-icon history">
            <i className="fas fa-history"></i>
          </div>
          <div className="action-content">
            <h4>История продаж</h4>
            <p>Просмотр всех продаж</p>
            <button className="action-btn secondary">
              Посмотреть историю
            </button>
          </div>
        </div>
        
        <div className="action-card">
          <div className="action-icon stats">
            <i className="fas fa-chart-bar"></i>
          </div>
          <div className="action-content">
            <h4>Статистика</h4>
            <p>Аналитика продаж</p>
            <button className="action-btn secondary">
              Открыть отчёты
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        :root {
          --primary-color: #0b3d91;
          --secondary-color: #112e51;
          --accent-color: #d8b365;
          --success-color: #0f9d58;
          --warning-color: #f4b400;
          --danger-color: #db4437;
          --dark-color: #202124;
          --light-bg: #f0f2f5;
          --white: #ffffff;
          --text-color: #333;
          --light-text: #757575;
          --border-color: #dadce0;
          --shadow: 0 4px 15px rgba(0,0,0,0.15);
          --shadow-lg: 0 10px 25px rgba(0,0,0,0.15);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: var(--light-bg);
          color: var(--text-color);
          line-height: 1.6;
        }

        .dashboard {
          min-height: 100vh;
          background: var(--light-bg);
        }

        .dashboard-header {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          padding: 20px 40px;
          box-shadow: var(--shadow);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .user-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          border: 2px solid var(--accent-color);
        }

        .user-info h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .user-info p {
          opacity: 0.9;
          font-size: 14px;
        }

        .logout-btn {
          background: var(--danger-color);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
          font-size: 16px;
        }

        .logout-btn:hover {
          background: #c0392b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .dashboard-content {
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .nav-tabs {
          display: flex;
          background: white;
          border-radius: 12px;
          box-shadow: var(--shadow);
          margin-bottom: 30px;
          overflow: hidden;
        }

        .nav-tab {
          flex: 1;
          padding: 16px 24px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
          color: var(--light-text);
          transition: all 0.3s;
        }

        .nav-tab.active {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
        }

        .nav-tab:not(.active):hover {
          background: #f8f9fa;
          color: var(--primary-color);
        }

        .tab-content {
          background: white;
          border-radius: 12px;
          box-shadow: var(--shadow);
          padding: 40px;
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
        }

        .stat-icon.users { background: linear-gradient(135deg, var(--success-color), #27ae60); }
        .stat-icon.online { background: linear-gradient(135deg, #3498db, #2980b9); }
        .stat-icon.sales { background: linear-gradient(135deg, var(--warning-color), #e67e22); }
        .stat-icon.logs { background: linear-gradient(135deg, #9b59b6, #8e44ad); }

        .stat-info {
          flex: 1;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 700;
          color: var(--dark-color);
          margin-bottom: 4px;
        }

        .stat-label {
          color: var(--light-text);
          font-size: 14px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid var(--border-color);
        }

        .section-header .section-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .section-header h3 {
          font-size: 22px;
          font-weight: 600;
          color: var(--dark-color);
          flex: 1;
        }

        .activity-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: var(--light-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
        }

        .activity-details {
          flex: 1;
        }

        .activity-text {
          margin-bottom: 4px;
          color: var(--text-color);
        }

        .activity-time {
          font-size: 12px;
          color: var(--light-text);
        }

        .online-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .online-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .online-item:last-child {
          border-bottom: none;
        }

        .online-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .online-info {
          flex: 1;
        }

        .online-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .online-username {
          font-size: 14px;
          color: var(--light-text);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .status-indicator.online {
          background: var(--success-color);
          box-shadow: 0 0 10px rgba(15, 157, 88, 0.5);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--light-text);
        }

        .empty-state i {
          font-size: 48px;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        .add-seller-btn {
          background: var(--success-color);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }

        .add-seller-btn:hover {
          background: #0d8043;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .sellers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .seller-card {
          background: var(--light-bg);
          border-radius: 12px;
          padding: 24px;
          border: 1px solid var(--border-color);
          transition: all 0.3s;
        }

        .seller-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow);
          border-color: var(--primary-color);
        }

        .seller-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .seller-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .seller-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .seller-status.online {
          background: rgba(15, 157, 88, 0.1);
          color: var(--success-color);
        }

        .seller-status.offline {
          background: rgba(117, 117, 117, 0.1);
          color: var(--light-text);
        }

        .seller-name {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--dark-color);
        }

        .seller-username {
          color: var(--light-text);
          margin-bottom: 4px;
        }

        .seller-email {
          color: var(--light-text);
          font-size: 14px;
        }

        .seller-actions {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        .delete-btn {
          background: var(--danger-color);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s;
          font-size: 14px;
        }

        .delete-btn:hover {
          background: #c0392b;
          transform: scale(1.05);
        }

        .logs-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .log-item {
          display: flex;
          gap: 15px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .log-item:last-child {
          border-bottom: none;
        }

        .log-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--light-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
        }

        .log-content {
          flex: 1;
        }

        .log-text {
          margin-bottom: 4px;
        }

        .log-time {
          font-size: 12px;
          color: var(--light-text);
          font-family: monospace;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: 2px solid var(--border-color);
          background: white;
          color: var(--text-color);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .filter-btn:hover {
          background: var(--light-bg);
          border-color: var(--primary-color);
          color: var(--primary-color);
          transform: translateY(-1px);
        }

        .filter-btn.active {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          border-color: var(--primary-color);
          box-shadow: 0 2px 8px rgba(11, 61, 145, 0.3);
        }

        .filter-btn.active:hover {
          background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(11, 61, 145, 0.4);
        }

        .filter-btn i {
          font-size: 12px;
        }

        .welcome-section {
          margin-bottom: 30px;
        }

        .welcome-text {
          color: var(--light-text);
          font-size: 16px;
          margin-top: 10px;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .action-card {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: var(--shadow);
          text-align: center;
          transition: all 0.3s;
          border: 1px solid var(--border-color);
        }

        .action-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-color);
        }

        .action-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 32px;
          color: white;
        }

        .action-icon.new-sale { background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); }
        .action-icon.history { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
        .action-icon.stats { background: linear-gradient(135deg, var(--warning-color), #e67e22); }

        .action-content h4 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--dark-color);
        }

        .action-content p {
          color: var(--light-text);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .action-btn {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
          width: 100%;
          font-size: 14px;
        }

        .admin-panel-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  font-size: 16px;
}

.admin-panel-btn:hover {
  background: #d4a15c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

        .action-btn.primary {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
        }

        .action-btn.primary:hover {
          background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .action-btn.secondary {
          background: var(--light-text);
          color: white;
        }

        .action-btn.secondary:hover {
          background: var(--text-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 15px 20px;
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .dashboard-content {
            padding: 20px;
          }

          .stats-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .sellers-grid {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }

          .nav-tabs {
            flex-direction: column;
          }

          .tab-content {
            padding: 20px;
          }

          .filter-buttons {
            flex-wrap: wrap;
            margin-left: 0;
            margin-top: 15px;
            gap: 8px;
          }

          .filter-btn {
            padding: 8px 12px;
            font-size: 12px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .stats-container {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 16px;
          }

          .section-header .section-icon {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .filter-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
          }
        }
      `}</style>

<div className="dashboard-header">
  <div className="user-section">
    <div className="user-avatar"><i className="fas fa-user"></i></div>
    <div className="user-info">
      <h2>{user.fullname}</h2>
      <p>{user.role === 'owner' ? 'Владелец системы' : 'Продавец'} • {user.username}</p>
    </div>
  </div>

  <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
    {user.role === 'owner' && (
      <button 
        className="admin-panel-btn"
        onClick={() => navigate('/admin-panel')}
      >
        <i className="fas fa-tools"></i> Админ-панель
      </button>
    )}
          
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            Выйти
          </button>
        </div>

        <div className="dashboard-content">
          {user.role === 'owner' ? (
            <>
              <div className="nav-tabs">
                <button className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                  <i className="fas fa-chart-pie"></i> Обзор
                </button>
                <button className={`nav-tab ${activeTab === 'sellers' ? 'active' : ''}`} onClick={() => setActiveTab('sellers')}>
                  <i className="fas fa-users"></i> Продавцы
                </button>
                <button className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                  <i className="fas fa-file-alt"></i> Журнал
                </button>
              </div>
              <div className="tab-content">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'sellers' && <SellersTab />}
                {activeTab === 'logs' && <LogsTab />}
              </div>
            </>
          ) : (
            <div className="tab-content">
              <SellerDashboard />
            </div>
          )}
        </div>
      </div>
    </>
  );
}